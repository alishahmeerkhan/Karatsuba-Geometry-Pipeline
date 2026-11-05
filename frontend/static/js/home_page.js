const HOVERED_WIDTH = 70;
const NON_HOVERED_WIDTH = 30;

const KaratsubaDiv = document.querySelector('.Karatsuba');
const ClosestPairDiv = document.querySelector('.ClosestPair');

window.addEventListener('mousemove', (event) => {
    let mouse_x = event.clientX;

    if (mouse_x <= KaratsubaDiv.offsetWidth) {
        KaratsubaDiv.style.width = `${HOVERED_WIDTH}%`;
        ClosestPairDiv.style.width = `${NON_HOVERED_WIDTH}%`;

    }
    else {
        KaratsubaDiv.style.width = `${NON_HOVERED_WIDTH}%`;
        ClosestPairDiv.style.width = `${HOVERED_WIDTH}%`;
    }

});

window.addEventListener('mouseout', (event) => {
    if (!event.relatedTarget) {
        KaratsubaDiv.style.width = '50%';
        ClosestPairDiv.style.width = '50%';
    }
});