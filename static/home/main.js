document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-text').addEventListener('click', () => {
        createDraggableElement('Text Box');
    });

    document.getElementById('add-image').addEventListener('click', () => {
        createDraggableElement('Image Box', 'image');
    });

    document.getElementById('add-chart').addEventListener('click', () => {
        createDraggableElement('Chart Box', 'chart');
    });

    function createDraggableElement(content, type) {
        const el = document.createElement('div');
        el.classList.add('draggable-element');

        if (type === 'image') {
            const img = document.createElement('img');
            // Sample image from Unsplash
            img.src = 'https://images.unsplash.com/photo-1581090700227-1e37b190418e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8fHx8fHwxNjUxMjM4NTQ0&ixlib=rb-1.2.1&q=80&w=1080';
            img.style.width = '100%';
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
        makeElementDraggable(el);
    }

    function addCloseButton(element) {
        const closeButton = document.createElement('span');
        closeButton.textContent = 'X';
        closeButton.classList.add('close-button');
        closeButton.onclick = function() { element.remove(); };
        element.appendChild(closeButton);
    }

    function initializeChart(canvas) {
        const chartCanvas = canvas;
        chartCanvas.width = 200; // Set the chart width
        chartCanvas.height = 150; // Set the chart height

        const ctx = chartCanvas.getContext('2d');
        const chart = new Chart(ctx, {
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

        return chart;
    }

    function makeElementDraggable(element) {
        interact(element).draggable({
            listeners: { move: dragMoveListener },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ]
        });
    }

    function dragMoveListener(event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }
});
