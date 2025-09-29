async function renderForm(formDef, submitUrl) {
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

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formEl);
    const json = {};
    formData.forEach((value, key) => { json[key] = value; });

    try {
      const resp = await fetch(formEl.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: json }),
      });
      await resp.json();
      const msg = document.createElement('p');
      msg.textContent = '✅ Form submitted successfully!';
      formEl.appendChild(msg);
    } catch (err) {
      const msg = document.createElement('p');
      msg.textContent = '❌ Submission failed. Please try again.';
      formEl.appendChild(msg);
    }
  });

  document.body.appendChild(formEl);
}

async function loadForms() {
  try {
    const res = await fetch('/form.json');
    const forms = await res.json();

    const defs = await Promise.all(
      forms.data
        .filter((row) => row.Form)
        .map(async (row) => {
          const formRes = await fetch(row.Form);
          const formDef = await formRes.json();
          return { def: formDef, submit: row.Submit };
        }),
    );

    defs.forEach(({ def, submit }) => renderForm(def, submit));
  } catch (err) {
    // handle gracefully instead of console.error
    const msg = document.createElement('p');
    msg.textContent = '❌ Could not load forms.';
    document.body.appendChild(msg);
  }
}

loadForms();
