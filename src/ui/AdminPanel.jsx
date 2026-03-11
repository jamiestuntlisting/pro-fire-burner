// Admin Panel - React component for level editing
// This file is designed to be loaded dynamically when admin mode is activated

export function createAdminPanel(container, levelManager, onClose) {
  const levels = levelManager.levels;
  const defaultLevels = levelManager.defaultLevels;

  const editableFields = [
    'id', 'theme', 'levelType', 'timeOfDay', 'costumeDescription',
    'mapWidth', 'mapHeight', 'numFireSafeties', 'numGelPickups', 'numFuelPickups',
    'hasWaterFeatures', 'numTorches', 'numPropaneCannons', 'numExtras', 'numPrincipals',
    'cameraFOV', 'cameraPanSpeed', 'gelDepletionRate', 'fuelDepletionRate',
    'hasCameraCar', 'timeLimit', 'title',
  ];

  const numericFields = [
    'id', 'mapWidth', 'mapHeight', 'numFireSafeties', 'numGelPickups', 'numFuelPickups',
    'numTorches', 'numPropaneCannons', 'numExtras', 'numPrincipals',
    'cameraFOV', 'cameraPanSpeed', 'gelDepletionRate', 'fuelDepletionRate', 'timeLimit',
  ];

  const boolFields = ['hasWaterFeatures', 'hasCameraCar'];

  let changedCells = new Set();

  function render() {
    container.style.display = 'block';
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'padding:20px; max-width:100%; overflow-x:auto; color:#ddd; font-family:monospace; font-size:12px;';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'ADMIN PANEL - Level Editor';
    title.style.cssText = 'color:#ffcc00; margin-bottom:10px;';
    wrapper.appendChild(title);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'margin-bottom:15px;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Changes';
    saveBtn.style.cssText = 'padding:6px 16px; margin-right:10px; background:#44aa44; color:#fff; border:none; cursor:pointer; font-family:monospace;';
    saveBtn.onclick = () => {
      levelManager.setLevels(JSON.parse(JSON.stringify(levels)));
      changedCells.clear();
      render();
    };

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset to Defaults';
    resetBtn.style.cssText = 'padding:6px 16px; margin-right:10px; background:#cc4444; color:#fff; border:none; cursor:pointer; font-family:monospace;';
    resetBtn.onclick = () => {
      levelManager.resetToDefaults();
      for (let i = 0; i < levels.length; i++) {
        Object.assign(levels[i], levelManager.levels[i]);
      }
      changedCells.clear();
      render();
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'padding:6px 16px; background:#666; color:#fff; border:none; cursor:pointer; font-family:monospace;';
    closeBtn.onclick = () => {
      container.style.display = 'none';
      container.innerHTML = '';
      if (onClose) onClose();
    };

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(resetBtn);
    btnRow.appendChild(closeBtn);
    wrapper.appendChild(btnRow);

    // Table
    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse; font-size:11px; width:100%;';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const field of editableFields) {
      const th = document.createElement('th');
      th.textContent = field;
      th.style.cssText = 'padding:4px 8px; background:#333; color:#ffcc00; border:1px solid #555; white-space:nowrap;';
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    for (let i = 0; i < levels.length; i++) {
      const row = document.createElement('tr');
      row.style.background = i % 2 === 0 ? '#1a1a2a' : '#222233';

      for (const field of editableFields) {
        const td = document.createElement('td');
        td.style.cssText = 'padding:2px 4px; border:1px solid #444;';

        const cellKey = `${i}:${field}`;
        if (changedCells.has(cellKey)) {
          td.style.background = '#554400';
        }

        const value = levels[i][field];

        if (boolFields.includes(field)) {
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = !!value;
          cb.onchange = () => {
            levels[i][field] = cb.checked;
            changedCells.add(cellKey);
            td.style.background = '#554400';
          };
          td.appendChild(cb);
        } else {
          const input = document.createElement('input');
          input.type = 'text';
          input.value = value;
          input.style.cssText = 'width:80px; background:#111; color:#ddd; border:1px solid #444; padding:2px 4px; font-family:monospace; font-size:11px;';

          input.onblur = () => {
            let newVal = input.value;
            if (numericFields.includes(field)) {
              newVal = parseFloat(newVal);
              if (isNaN(newVal)) {
                input.value = levels[i][field];
                return;
              }
            }
            if (levels[i][field] !== newVal) {
              levels[i][field] = newVal;
              changedCells.add(cellKey);
              td.style.background = '#554400';
            }
          };
          td.appendChild(input);
        }

        row.appendChild(td);
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  }

  render();
}
