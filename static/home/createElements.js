function createDraggableElement(content, type) {
    const el = document.createElement('div');
    el.classList.add('draggable-element');

    if (type === 'image') {
        const img = document.createElement('img');
        img.src = 'https://images.unsplash.com/photo-1581090700227-1e37b190418e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8fHx8fHwxNjUxMjM4NTQ0&ixlib=rb-1.2.1&q=80&w=1080';
        img.style.width = '100%';
        img.style.height = 'auto';
        el.appendChild(img);
    } else if (type === 'chart') {
        const canvas = document.createElement('canvas');
        initializeChart(canvas);
        el.appendChild(canvas);
    } else {
        el.textContent = content;
    }

    addCloseButton(el);
    document.getElementById('presentation-area').appendChild(el);
    makeElementDraggableAndResizable(el);
}

function addCloseButton(element) {
    const closeButton = document.createElement('span');
    closeButton.textContent = 'X';
    closeButton.classList.add('close-button');
    closeButton.onclick = function() { element.remove(); };
    element.appendChild(closeButton);
}

function initializeChart(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Label 1', 'Label 2', 'Label 3'],
            datasets: [{
                label: 'Sample Data',
                data: [10, 20, 30],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: false,
            scales: {
                x: {
                    beginAtZero: true
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function resizeChart(element) {
    if (element.querySelector('canvas')) {
        const canvas = element.querySelector('canvas');
        canvas.width = element.offsetWidth;
        canvas.height = element.offsetHeight;
        if (canvas.chart) {
            canvas.chart.resize();
        }
    }
}
