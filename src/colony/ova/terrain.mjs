/**
* Düz Ova world by İhan. Recovered from MARS-KOLONISI-DUZ-OVA.html
* (NASAYarismasi/-lhan, commit d6caf78); adapted to shared Three.js/environment.
* Dimensions, textures and layout below are artistic GAME ASSUMPTIONS, not surveyed Mars data.
*/
import * as THREE from "three";
export function plainHeight(x, z) {
	return .09 * Math.sin(x * .054 + z * .025) + .07 * Math.sin(z * .067 - x * .034);
}
export function createRegolithDetail() {
	let canvas = document.createElement("canvas");
	canvas.width = canvas.height = 512;
	let context = canvas.getContext("2d"), seed = 13177, random = () => (seed = Math.imul(seed, 1664525) + 1013904223 >>> 0, seed / 4294967296), pixels = context.createImageData(512, 512);
	for (let index = 0; index < pixels.data.length; index += 4) {
		let x = 96 + (random() - .5) * 120;
		pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = Math.max(0, Math.min(255, x)), pixels.data[index + 3] = 255;
	}
	context.putImageData(pixels, 0, 0);
	let tile = (index) => {
		for (let x = -512; x <= 512; x += 512) for (let y = -512; y <= 512; y += 512) index(x, y);
	};
	for (let index = 0; index < 90; index++) {
		let x = random() * 512, y = random() * 512, radius = 18 + random() * 70;
		tile((offsetX, offsetY) => {
			let shade = context.createRadialGradient(x + offsetX, y + offsetY, 0, x + offsetX, y + offsetY, radius), tileX = random() < .5 ? 255 : 0;
			shade.addColorStop(0, "rgba(" + tileX + "," + tileX + "," + tileX + ",0.10)"), shade.addColorStop(1, "rgba(" + tileX + "," + tileX + "," + tileX + ",0)"), context.fillStyle = shade, context.beginPath(), context.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2), context.fill();
		});
	}
	for (let index = 0; index < 1400; index++) {
		let x = random() * 512, y = random() * 512, radius = .7 + Math.pow(random(), 2.4) * 5.2, offsetX = random() * Math.PI, shade = random() < .55 ? 175 + random() * 70 : 45 + random() * 55;
		tile((tileX, tileY) => {
			context.fillStyle = "rgba(" + Math.round(shade) + "," + Math.round(shade) + "," + Math.round(shade) + "," + (.28 + random() * .35) + ")", context.beginPath(), context.ellipse(x + tileX, y + tileY, radius, radius * (.55 + random() * .5), offsetX, 0, Math.PI * 2), context.fill(), context.strokeStyle = "rgba(255,255,255,0.16)", context.lineWidth = .8, context.beginPath(), context.arc(x + tileX, y + tileY, radius * 1.02, Math.PI * 1.05, Math.PI * 1.85), context.stroke();
		});
	}
	context.lineWidth = 1;
	for (let index = 0; index < 40; index++) {
		let x = random() * 512, y = 2 + random() * 6, radius = .02 + random() * .05;
		context.strokeStyle = random() < .5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)", context.beginPath();
		for (let offsetX = 0; offsetX <= 512; offsetX += 4) {
			let offsetY = x + Math.sin(offsetX * radius + index) * y;
			offsetX === 0 ? context.moveTo(offsetX, offsetY) : context.lineTo(offsetX, offsetY);
		}
		context.stroke();
	}
	let texture = new THREE.CanvasTexture(canvas);
	return texture.wrapS = texture.wrapT = THREE.RepeatWrapping, texture.colorSpace = THREE.NoColorSpace, texture.anisotropy = 16, texture;
}
export function createPlainTextures(moon = !1, radius = 450) {
	let canvas = document.createElement("canvas");
	canvas.width = canvas.height = 2048;
	let context = canvas.getContext("2d"), palette = moon ? {
		base: [
			146,
			147,
			152
		],
		light: [
			216,
			217,
			221
		],
		dark: [
			76,
			77,
			82
		],
		rock: [
			118,
			119,
			125
		],
		ray: [
			238,
			240,
			244
		]
	} : {
		base: [
			148,
			95,
			72
		],
		light: [
			203,
			158,
			126
		],
		dark: [
			88,
			54,
			43
		],
		rock: [
			121,
			82,
			64
		],
		ray: [
			212,
			160,
			122
		]
	}, rgba = (index, x) => "rgba(" + index[0] + ", " + index[1] + ", " + index[2] + ", " + x + ")";
	context.fillStyle = rgba(palette.base, 1), context.fillRect(0, 0, 2048, 2048);
	let seed = 4921, random = () => (seed = Math.imul(seed, 1664525) + 1013904223 >>> 0, seed / 4294967296), toUV = (index, x) => ({
		u: (index + radius) / (2 * radius) * 2048,
		v: (x + radius) / (2 * radius) * 2048
	});
	for (let index = 0; index < 360; index++) {
		let x = random() * 2048, y = random() * 2048, size = 26 + Math.pow(random(), 2.1) * 165, tone = random() < .55 ? palette.light : palette.dark, gradient = context.createRadialGradient(x, y, 0, x, y, size);
		gradient.addColorStop(0, rgba(tone, .14 + random() * .24)), gradient.addColorStop(1, rgba(tone, 0)), context.fillStyle = gradient, context.beginPath(), context.arc(x, y, size, 0, Math.PI * 2), context.fill();
	}
	for (let index = 0; index < 2600; index++) {
		let x = random() * 2048, y = random() * 2048, size = 2 + Math.pow(random(), 1.6) * 15, tone = random() < .5 ? palette.light : palette.dark, gradient = context.createRadialGradient(x, y, 0, x, y, size);
		gradient.addColorStop(0, rgba(tone, .1 + random() * .18)), gradient.addColorStop(1, rgba(tone, 0)), context.fillStyle = gradient, context.beginPath(), context.arc(x, y, size, 0, Math.PI * 2), context.fill();
	}
	context.lineWidth = 2;
	for (let index = 0; index < 90; index++) {
		let x = random() * 2048, y = 2 + random() * 8, size = .004 + random() * .012, tone = random() < .5 ? palette.light : palette.dark;
		context.strokeStyle = rgba(tone, .03 + random() * .05), context.beginPath();
		for (let gradient = 0; gradient <= 2048; gradient += 8) {
			let wave = x + Math.sin(gradient * size + index) * y + Math.sin(gradient * size * 2.7) * y * .4;
			gradient === 0 ? context.moveTo(gradient, wave) : context.lineTo(gradient, wave);
		}
		context.stroke();
	}
	for (let index = 0; index < 18e3; index++) {
		let x = random() * 2048, y = random() * 2048, size = .5 + Math.pow(random(), 2) * 3.6, tone = random(), gradient = tone < .45 ? palette.rock : tone < .8 ? palette.dark : palette.light;
		context.fillStyle = rgba(gradient, .16 + random() * .46), context.beginPath(), context.ellipse(x, y, size, size * (.55 + random() * .5), random() * Math.PI, 0, Math.PI * 2), context.fill();
	}
	let pixels = context.getImageData(0, 0, 2048, 2048), data = pixels.data;
	for (let index = 0; index < data.length; index += 4) {
		let x = (random() - .5) * (moon ? 26 : 18);
		data[index] = Math.min(255, Math.max(0, data[index] + x)), data[index + 1] = Math.min(255, Math.max(0, data[index + 1] + x)), data[index + 2] = Math.min(255, Math.max(0, data[index + 2] + x));
	}
	context.putImageData(pixels, 0, 0);
	let albedoTexture = new THREE.CanvasTexture(canvas);
	albedoTexture.colorSpace = THREE.SRGBColorSpace, albedoTexture.wrapS = albedoTexture.wrapT = THREE.ClampToEdgeWrapping, albedoTexture.anisotropy = 16;
	let bumpCanvas = document.createElement("canvas");
	bumpCanvas.width = bumpCanvas.height = 256;
	let bumpContext = bumpCanvas.getContext("2d"), bumpPixels = bumpContext.createImageData(256, 256);
	for (let index = 0; index < bumpPixels.data.length; index += 4) {
		let x = 96 + random() * 96;
		bumpPixels.data[index] = bumpPixels.data[index + 1] = bumpPixels.data[index + 2] = x, bumpPixels.data[index + 3] = 255;
	}
	bumpContext.putImageData(bumpPixels, 0, 0);
	let bumpTexture = new THREE.CanvasTexture(bumpCanvas);
	return bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping, bumpTexture.repeat.set(radius * .85, radius * .85), bumpTexture.anisotropy = 8, {
		albedoTexture,
		bumpTexture
	};
}
