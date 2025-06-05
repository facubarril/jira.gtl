const messageSuccessStyle = ['border-lime-300', 'bg-lime-500', 'text-lime-950', 'flex'];
const messageErrorStyle = ['border-rose-300', 'bg-rose-400', 'text-rose-950', 'flex']

const toggleConfig = () => {
    const btn = document.querySelector('button#toggleConfig'),
        status = btn.dataset.visible === 'true' ? true : false

    btn.innerText = !status ? 'Hide config' : 'Show config'
    btn.dataset.visible = !status
}

const showMessage = (message, style) => {
    const alert = document.querySelector('div#message');

    alert.innerText = message;
    alert.classList.add(...style)
    alert.classList.remove('hidden');

    setTimeout(() => {
        alert.classList.add('hidden')
        alert.classList.remove(...style)
        alert.innerText = ''
    }, 4000)
}

const generateTable = () => {
    const data = dataObj,
        container = document.querySelector('div#previewData'),
        table = container.querySelector('table'),
        btn = document.querySelector('button#sendToJira');

    if (data.length === 0) return;

    table.innerHTML = ''
    btn.classList.add('hidden')

    const tableHeader = '<thead class="text-xs text-slate-400 uppercase bg-slate-900"><tr><th class="px-6 py-3">ID</th><th class="px-6 py-3">Descripción</th><th></th><th class="px-6 py-3">Tiempo</th></tr></thead><tbody>';
    table.innerHTML += tableHeader

    data.forEach(item => {
        table.innerHTML += `<tr><td class="px-2 py-1">${item.id}</td><td class="px-2 py-1">${item.desc}</td><td></td><td class="px-2 py-1">${item.tiempo}</td></tr>`
    })

    table.innerHTML += '</tbody>'

    btn.classList.remove('hidden')
}

function getLocalDateForInput(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

const openPop = tgt => {
    if (!tgt.closest('.help').classList.contains('hidden')) closePops()
    tgt.closest('.help').querySelector('.pop').classList.remove('hidden')
}
const closePops = () => document.querySelectorAll('.pop').forEach(pop => !pop.classList.contains('hidden') && pop.classList.add('hidden'))

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('input#date').value = getLocalDateForInput(new Date());

    document.addEventListener('click', e => {
        e.target.closest('.help') ? openPop(e.target) : closePops()
    })
})
