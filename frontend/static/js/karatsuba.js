LINE_LENGTH = innerHeight - 150;

const canvas = document.querySelector('canvas');

canvas.width = `${innerWidth - 20}`;
canvas.height = `${innerHeight - 130}`;

const context = canvas.getContext('2d');