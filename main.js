const storageName = 'jira.gtl.data';
let schemaArr = []; // Almacenamiento de schema
let multipleIdArr = []; // Almacenamiento para unir ID

let dataObj = [] // Almacenamiento de datos del log

const schemaHandle = e => {
    if (e.target.tagName !== 'BUTTON') return;

    const btn = e.target,
        schema = btn.dataset.schema,
        input = document.querySelector('input#schema');

    schema === '-1'
        ? schemaArr.pop()
        : schemaArr.push(schema);
    
    input.value = schemaArr.join('');

    const idCount = schemaArr.filter(v => v === 'id').length;
    toggleMultipleIdForm(idCount > 1)
}

const multipleIdHandle = e => {
    if (e.target.tagName !== 'BUTTON') return;

    const btn = e.target,
        schema = btn.dataset.schema,
        input = document.querySelector('input#multipleId');

    schema === '-1'
        ? multipleIdArr.pop()
        : multipleIdArr.push(schema);

    input.value = multipleIdArr.join('');
}

const toggleMultipleIdForm = val => {
    if (val) {
        document.querySelector('.multipleId-group').style.display = 'flex';
        hasMultipleId = true
    } else {
        hasMultipleId = false
        document.querySelector('.multipleId-group').style.display = 'none';
    }
}

const handleLoadData = () => {
    const storageData = localStorage.getItem(storageName);

    if (!storageData) {
        toggleConfig()
        return;
    }

    const data = JSON.parse(storageData)
    Object.entries(data).forEach(([key, value]) => {
        const input = document.querySelector(`input#${key}`)

        key === 'omitWorkAndRest'
            ? input.checked = Boolean(value)
            : input.value = typeof value === 'string' ? value : value.join("")

        if (key === 'schema') schemaArr = Array.isArray(value) ? [...value] : [];
        if (key === 'multipleId') multipleIdArr = Array.isArray(value) ? [...value] : [];
    })

    if (data['multipleId'] !== '' && data['multipleId'] !== undefined) toggleMultipleIdForm(true)
}

const handleSaveData = () => {

    const formData = {
        domain: document.querySelector('input#domain').value,
        email: document.querySelector('input#email').value,
        api: document.querySelector('input#api').value,
        schema: schemaArr,
        multipleId: multipleIdArr,
        omitWorkAndRest: document.querySelector('input#omitWorkAndRest').checked
    }

    if (localStorage.getItem(storageName)) localStorage.removeItem(storageName)
    localStorage.setItem(storageName, JSON.stringify(formData))

    const isInStorage = localStorage.getItem(storageName) ? true : false;
    const alertText = isInStorage ? 'Data saved correctly.' : 'Could not save data.',
        alertStyle = isInStorage ? ui.messageSuccessStyle : ui.messageErrorStyle;

    showMessage(alertText, alertStyle)
}

const handleLogPaste = e => {
    // Función para formateo de tiempo
    function formatTime(rawTime) {
        const match = rawTime.match(/(\d+)\s*h\s*(\d+)\s*min/);
        if (!match) return rawTime;

        const hours = match[1];
        const minutes = match[2];

        return `${hours}h${minutes}m`;
    }

    // Función para limpiar schema (eliminar todo antes del primer "idX")
    function getCleanSchema(schema) {
        const idRegex = /^id\d+$/;
        const startIndex = schema.findIndex(token => idRegex.test(token));
        return startIndex === -1 ? [] : schema.slice(startIndex);
    }

     // Función para generar regex dinámicamente
    function generateRegexFromSchema(schema) {
        const patterns = {
            cat: '([^:]+?)',
            id1: '(?<id1>\\S+)',
            id2: '(?<id2>\\S+)',
            desc: '(?<desc>.*)'
        };

        let regexStr = '';
        for (const token of schema) {
            regexStr += patterns[token] ? patterns[token] : token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        } 

        return new RegExp(`^${regexStr}$`);
    }

    // Datos del textarea
    const logText = e.clipboardData.getData('text/plain');

    // 1. Renombrar "id" → "id1", "id2", ...
    let idCounter = 1;
    const modSchemaArr = schemaArr.map(token => {
        if (token === 'id') {
            return `id${idCounter++}`;
        }
        return token;
    });

    // Generar versiones limpias del schema
    const schemaArrNoCat = getCleanSchema(modSchemaArr);

    // Construir ambas regex
    const lineRegexWithCat = generateRegexFromSchema(modSchemaArr);
    const lineRegexWithoutCat = generateRegexFromSchema(schemaArrNoCat);

    // Limpiar datos previos
    dataObj = [];

    // Procesar línea por línea
    logText
        .split('\n')
        .filter(line => line.trim())
        .forEach(line => {
            const timeMatch = line.match(/^(\d+ h \d+ min)/);
            const tiempo = timeMatch ? formatTime(timeMatch[1]) : null;

            const lineWithoutTime = line.replace(/^(\d+ h \d+ min)\s*/, '').trim();

            // Intentar con ambas regex
            let match = lineRegexWithCat.exec(lineWithoutTime);
            if (!match) {
                match = lineRegexWithoutCat.exec(lineWithoutTime);
            }

            if (!match || !tiempo) {
                console.warn("Línea ignorada:", lineWithoutTime);
                return;
            }

            // Extraer campos comunes
            const id1 = match.groups?.id1?.trim();
            const id2 = match.groups?.id2?.trim();
            const desc = match.groups?.desc?.trim();

            if (!id1) {
                console.warn("IDs incompletos:", lineWithoutTime);
                return;
            }

            // Formar el ID final
            let idFinal;
            if (id2) {
                const idParts = []
                idParts.push(id1, id2)
                idFinal = idParts.join(multipleIdArr[0])
            } else {
                idFinal = id1
            }

            // Omitir si termina en ** y está activo el filtro
            if (document.querySelector('input#omitWorkAndRest').checked && desc?.endsWith('**')) {
                return;
            }

            // Agregar al dataObj
            dataObj.push({
                tiempo,
                id: idFinal,
                desc
            });
        });

    ui.generateTable();
};

const sendToJira = () => {
    const domain = document.querySelector('input#domain').value;
    const email = document.querySelector('input#email').value;
    const apiToken = document.querySelector('input#api').value;
    const date = document.querySelector('input#date').value;

    if (!domain || !email || !apiToken || !date) return;

    dataObj.forEach(item => {
        fetch('./send.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                domain,
                email,
                apiToken,
                item,
                date
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                ui.showMessage('Ha ocurrido un error al procesar los datos', ui.messageErrorStyle)
                console.error("Error desde PHP:", data);
            } else {
                ui.showMessage('El log se ha enviado correctamente', ui.messageSuccessStyle)
                console.log("Enviado a Jira:", data);
             }
        })
        .catch(err => {
            ui.showMessage('Ha ocurrido un error al contactar con el servidor', ui.messageErrorStyle)
            console.error("Error al enviar:", err);
        });

        
    });

    const table = document.querySelector('#previewData table'),
        btn = document.querySelector('button#sendToJira'),
        textarea = document.querySelector('textarea#log');

    table.innerHTML = ''
    textarea.value = ''
    btn.classList.add('hidden')
};

document.addEventListener('DOMContentLoaded', () => {
    handleLoadData();
    document.querySelector('.schema-btn-group').addEventListener('click', schemaHandle);
    document.querySelector('.multipleId-btn-group').addEventListener('click', multipleIdHandle);
    document.querySelector('textarea#log').addEventListener('paste', handleLogPaste);
})
