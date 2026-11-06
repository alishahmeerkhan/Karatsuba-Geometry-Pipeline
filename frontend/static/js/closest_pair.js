LINE_LENGTH = innerHeight - 150;

const canvas = document.querySelector('canvas');

canvas.width = `${innerWidth - 20}`;
canvas.height = `${innerHeight - 130}`;

const context = canvas.getContext('2d');

function drawPoints(x_cord, y_cord) {
    context.beginPath();
    context.arc(x_cord, y_cord, 4, 0, 2 * Math.PI);
    context.stroke();

    context.font = '12px Arial';
    context.fillText(`(${x_cord}, ${y_cord})`, x_cord + 5, y_cord + 10);
}

function drawLine(x_cord, y_cord) {
    context.moveTo(x_cord, y_cord);
    context.lineTo(x_cord, y_cord + LINE_LENGTH);
    context.stroke();
}