let currentMaxZIndex = 1000; // Base z-index for draggable elements

function addDeleteButton(element) {
    if (!element.querySelector('.close-button')){ 

    const closeButton = document.createElement('span');
    closeButton.textContent = 'X';
    closeButton.classList.add('close-button');
    

    if(element.tagName.toLowerCase() === 'img' && !element.parentElement.querySelector('.close-button')){
        const divele = document.createElement('div');
        let pare = element.parentElement;
        divele.appendChild(element);
        pare.appendChild(divele);
        element=divele;
    }
    
    element.appendChild(closeButton);


    closeButton.onclick = function() { element.remove(); };
}
}


function getElementSelector(element) {
    // If the element has an ID, that's usually enough to uniquely identify it
    // if (element.id) {
    //     return `#${CSS.escape(element.id)}`;
    // }

    // If the element has classes, use them to create a selector
    if (element.className) {
        const classes = element.className.split(/\s+/);
        const classd= classes[classes.indexOf('draggable')];
        return `.${classd}`;
    }

    // Fallback to the tag name
    return element.tagName.toLowerCase();
}


function setupDraggable(selector){

    interact(selector).draggable({
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: '.right',
                endOnly: true
            })
        ],
        listeners: {

            move(event) {
                const target = event.target;
                // If already resized, use the translated x and y
                let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
                    y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                target.style.zIndex = ++currentMaxZIndex;

                const slide = document.querySelector('.slide');
                // console.log(slide.contains(target));
                if (slide.contains(target)) {
                    addDeleteButton(target);
                }

                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            }
        },
    })



}



// Function to initialize or update draggability and resizability
function setupResizable(element) {

    selector= getElementSelector(element);
    console.log(selector);

    interact(selector).resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        modifiers: [
            interact.modifiers.restrictEdges({
                outer: '.slide',
            })
        ],
        listeners: {
            move(event) {
                let { x, y } = event.target.dataset;

                x = (parseFloat(x) || 0) + event.deltaRect.left;
                y = (parseFloat(y) || 0) + event.deltaRect.top;

                Object.assign(event.target.style, {
                    width: `${event.rect.width}px`,
                    height: `${event.rect.height}px`,
                    transform: `translate(${x}px, ${y}px)`
                });

                Object.assign(event.target.dataset, { x, y });
            }
        }
    });
}

// Initialize draggable and resizable for existing draggable elements


// Configure dropzones
interact('.dropzone').dropzone({
    accept: '.draggable',
    overlap: 0.2,

    ondrop: function (event) {
        const draggableElement = event.relatedTarget,
              dropzoneElement = event.target;

        // When dropped, append the element to the dropzone and reset its position
        dropzoneElement.appendChild(draggableElement);
        draggableElement.classList.add('dropped')

        draggableElement.style.position = 'absolute';
        draggableElement.style.top = '0';
        draggableElement.style.left = '0';
        draggableElement.style.transform = 'none';
        draggableElement.setAttribute('data-x', 0);
        draggableElement.setAttribute('data-y', 0);

        // Ensure the dropped element is both draggable and resizable within the dropzone
        setupResizable(draggableElement);
    }
});