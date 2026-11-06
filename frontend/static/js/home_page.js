const HOVERED_WIDTH = 60;
const NON_HOVERED_WIDTH = 40;

const KaratsubaDiv = document.querySelector('.Karatsuba');
const ClosestPairDiv = document.querySelector('.ClosestPair');
const KaratsubaDivText = document.querySelector('.Karatsuba p');
const ClosestPairDivText = document.querySelector('.ClosestPair p');
const KaratsubaDivBtn = document.querySelector('.Karatsuba button');
const ClosestPairDivBtn = document.querySelector('.ClosestPair button');

window.addEventListener('mousemove', (event) => {
    let mouse_x = event.clientX;

    if (mouse_x <= KaratsubaDiv.offsetWidth) {
        KaratsubaDiv.style.width = `${HOVERED_WIDTH}%`;
        ClosestPairDiv.style.width = `${NON_HOVERED_WIDTH}%`;
        ClosestPairDivText.classList.add('hidden');
        ClosestPairDivBtn.classList.add('hidden');
        KaratsubaDivText.classList.remove('hidden');
        KaratsubaDivBtn.classList.remove('hidden');
    }
    else {
        KaratsubaDiv.style.width = `${NON_HOVERED_WIDTH}%`;
        ClosestPairDiv.style.width = `${HOVERED_WIDTH}%`;
        ClosestPairDivText.classList.remove('hidden');
        ClosestPairDivBtn.classList.remove('hidden');
        KaratsubaDivText.classList.add('hidden');
        KaratsubaDivBtn.classList.add('hidden');
    }
});

window.addEventListener('mouseout', (event) => {
    if (!event.relatedTarget) {
        KaratsubaDiv.style.width = '50%';
        ClosestPairDiv.style.width = '50%';
        ClosestPairDivText.classList.remove('hidden');
        KaratsubaDivText.classList.remove('hidden');
    }
});