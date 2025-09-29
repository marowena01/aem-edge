async function loadForms() {
  try {
    // This is the JSON generated from your Google Docs table
    const res = await fetch('/form.json');
    const forms = await res.json();

    // Loop each row in the table
    for (const row of forms.data) {
      const formUrl = row.Form;   // col1 = JSON definition
      const submitUrl = row.Submit; // col2 = Apps Script endpoint

      if (!formUrl) continue;

      // Fetch the form definition JSON
      const formRes = await fetch(formUrl);
      const formDef = await formRes.json();

      // Render the form
      renderForm(formDef, submitUrl);
    }
  } catch (err) {
    console.error('❌ Error loading forms:', err);
  }
}

function renderForm(formDef, submitUrl) {
  const formEl = document.createElement('form');
  formEl.method = 'POST';
  formEl.action = submitUrl || 'https://httpbin.org/post';

  formDef.data.forEach((field) => {
    if (field.Type === 'heading') {
      const h = document.createElement('h3');
      h.textContent = field.Label;
      formEl.appendChild(h);
    } else if (field.Type === 'plaintext') {
      const p = document.createElement('p');
      p.textContent = field.Label;
      formEl.appendChild(p);
    } else if (field.Type === 'text' || field.Type === 'email') {
      const input = document.createElement('input');
      input.type = field.Type;
      input.name = field.Name;
      input.placeholder = field.Placeholder || '';
      formEl.appendChild(input);
    } else if (field.Type === 'radio') {
      const label = document.createElement('label');
      label.textContent = field.Label;
      formEl.appendChild(label);
      (field.Options || '').split(',').forEach((opt) => {
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = field.Name;
        radio.value = opt.trim();
        formEl.appendChild(radio);
        formEl.appendChild(document.createTextNode(opt.trim()));
      });
    } else if (field.Type === 'submit') {
      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.textContent = field.Label || 'Submit';
      formEl.appendChild(btn);
    }
  });

  // Handle submission with fetch (avoid page reload + allow JSON)
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formEl);
    const json = {};

    formData.forEach((value, key) => {
      json[key] = value;
    });

    try {
      const resp = await fetch(formEl.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: json }),
      });
      const result = await resp.json();
      console.log('✅ Submitted:', result);
      alert('Form submitted successfully!');
    } catch (err) {
      console.error('❌ Submission error:', err);
      alert('Submission failed. Check console for details.');
    }
  });

  document.body.appendChild(formEl);
}

// Kick things off
loadForms();
