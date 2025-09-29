import createField from './form-fields.js';

async function submitForm(form) {
  // Collect form data
  const formData = new FormData(form);
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });

  try {
    // Build URL with query parameters (works better with Google Apps Script)
    const params = new URLSearchParams(data);
    const url = `${form.dataset.action}?${params.toString()}`;

    const resp = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });

    const result = await resp.json();

    if (result.status === 'ok') {
      // Success - redirect or show message
      if (form.dataset.confirmation) {
        window.location.href = form.dataset.confirmation;
      } else {
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'form-success';
        successMsg.innerHTML = '<p>✅ Form submitted successfully!</p>';
        form.replaceWith(successMsg);
      }
    } else {
      throw new Error('Submission failed');
    }
  } catch (err) {
    console.error('Form submission error:', err);
    // Show error message
    const errorMsg = document.createElement('div');
    errorMsg.className = 'form-error';
    errorMsg.innerHTML = '<p>❌ Submission failed. Please try again.</p>';

    // Remove any existing error messages
    form.querySelectorAll('.form-error').forEach(el => el.remove());
    form.appendChild(errorMsg);

    // Remove error after 5 seconds
    setTimeout(() => errorMsg.remove(), 5000);
  }
}

async function createForm(formDef) {
  const form = document.createElement('form');
  form.dataset.action = formDef.submitUrl;

  const fields = formDef.data || [];

  // Group fields by fieldset
  const fieldsets = {};
  fields.forEach((fd) => {
    const fieldsetName = fd.Fieldset || 'default';
    if (!fieldsets[fieldsetName]) {
      fieldsets[fieldsetName] = [];
    }
    fieldsets[fieldsetName].push(fd);
  });

  // Create fields
  await Promise.all(Object.entries(fieldsets).map(async ([fieldsetName, fieldsetFields]) => {
    let fieldsetEl = form;

    if (fieldsetName !== 'default') {
      const fieldsetWrapper = await createField({
        Type: 'fieldset',
        Name: fieldsetName,
        Label: fieldsetName,
      }, form);
      form.append(fieldsetWrapper);
      fieldsetEl = fieldsetWrapper.querySelector('fieldset');
    }

    await Promise.all(fieldsetFields.map(async (fd) => {
      try {
        const fieldWrapper = await createField(fd, form);
        if (fieldWrapper) {
          fieldsetEl.append(fieldWrapper);
        }
      } catch (err) {
        console.error('Error creating field:', fd, err);
      }
    }));
  }));

  // Handle form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Basic validation
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach((field) => {
      if (!field.value.trim()) {
        isValid = false;
        field.classList.add('error');
      } else {
        field.classList.remove('error');
      }
    });

    if (isValid) {
      submitForm(form);
    }
  });

  return form;
}

export default async function decorate(block) {
  // Get form reference from block
  const formLink = block.querySelector('a[href$=".json"]');
  if (!formLink) {
    console.error('No form JSON link found in block');
    return;
  }

  const formPath = formLink.href;
  const submitLink = block.querySelector('a[href*="script.google.com"]') || block.querySelector('a[href*="exec"]');
  const submitUrl = submitLink ? submitLink.href : null;

  if (!submitUrl) {
    console.error('No submit URL found in block');
    block.innerHTML = '<p class="form-error">Form configuration error: Missing submit URL</p>';
    return;
  }

  block.innerHTML = '';

  try {
    const resp = await fetch(formPath);
    if (!resp.ok) {
      throw new Error(`Failed to load form: ${resp.status}`);
    }

    const json = await resp.json();

    // Validate JSON structure
    if (!json.data || !Array.isArray(json.data)) {
      throw new Error('Invalid form definition: missing data array');
    }

    const formDef = {
      data: json.data,
      submitUrl,
    };

    const form = await createForm(formDef);
    block.append(form);
  } catch (err) {
    console.error('Error loading form:', err);
    block.innerHTML = '<p class="form-error">Unable to load form. Please try again later.</p>';
  }
}
