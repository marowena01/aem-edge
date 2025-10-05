import createField from './form-fields.js';

export default async function decorate(block) {
  const formLink = block.querySelector('a[href$=".json"]');
  if (!formLink) {
    console.error('No form JSON link found in block');
    return;
  }

  const formPath = formLink.href;

  // Look for the Apps Script submit URL
  const submitLink = block.querySelector('a[href*="script.google.com"]');
  const submitUrl = submitLink ? submitLink.href : null;

  if (!submitUrl) {
    console.error('No submit URL found');
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

async function createForm(formDef) {
  const form = document.createElement('form');

  // Set form action from definition or use default
  if (formDef.submitUrl) {
    form.action = formDef.submitUrl;
  }

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

    // Check if form has :type = sheet configuration
    const submitConfig = json.data.find((item) => item.Name === ':type');

    let submitUrl = null;

    if (submitConfig && submitConfig.Value === 'sheet') {
      // Use AEM Forms Submission Service
      submitUrl = '/.submit';
    } else {
      // Look for custom submit URL in the block
      const submitLink = block.querySelector('a[href*="script.google.com"]')
        || block.querySelector('a[href*="exec"]');
      submitUrl = submitLink ? submitLink.href : '/.submit';
    }

    const formDef = {
      data: json.data.filter((item) => !item.Name.startsWith(':')), // Filter out config rows
      submitUrl,
    };

    const form = await createForm(formDef);
    block.append(form);
  } catch (err) {
    console.error('Error loading form:', err);
    block.innerHTML = '<p class="form-error">Unable to load form. Please try again later.</p>';
  }
}
