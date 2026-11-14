/**
* Düz Ova world by İhan. Recovered from MARS-KOLONISI-DUZ-OVA.html
* (NASAYarismasi/-lhan, commit d6caf78); adapted to shared Three.js/environment.
* Dimensions, textures and layout below are artistic GAME ASSUMPTIONS, not surveyed Mars data.
*/
import * as THREE from "three";
import { plainHeight } from "./terrain.mjs";
export function createHabitat(scene) {
	let habitat = new THREE.Group(), obstacles = [];
	function placeHardware(model, x, z, yaw = 0) {
		let y = plainHeight(x, z);
		model.position.set(x, y, z), model.rotation.y = yaw, model.traverse((part) => {
			part.isMesh && (part.castShadow = !0, part.receiveShadow = !0);
		}), habitat.add(model);
		let bounds = new THREE.Box3().setFromObject(model).expandByScalar(.4);
		return obstacles.push(bounds), model;
	}
	let shellMaterial = new THREE.MeshStandardMaterial({
		vertexColors: !0,
		roughness: .91,
		flatShading: !0
	}), metalMaterial = new THREE.MeshStandardMaterial({
		color: 6840406,
		metalness: .45,
		roughness: .58
	}), floorMaterial = new THREE.MeshStandardMaterial({
		color: 7758670,
		roughness: .94
	}), hatchMaterial = new THREE.MeshStandardMaterial({
		color: 2631204,
		roughness: .52
	}), sandMaterial = new THREE.MeshStandardMaterial({
		color: 12625544,
		roughness: .7
	});
	function addPart(parent, geometry, material, x, y, z) {
		let mesh = new THREE.Mesh(geometry, material);
		return mesh.position.set(x, y, z), parent.add(mesh), mesh;
	}
	let shellPositions = [], shellColors = [], shellColor = new THREE.Color(), shellSegments = 28, shellProfile = [
		[3.65, 0],
		[3.65, .5],
		[3.56, .92],
		[3.33, 1.51],
		[3.02, 2.12],
		[2.55, 2.65],
		[1.87, 3.05],
		[1.03, 3.31]
	];
	function shellVertex(ringIndex, segmentIndex) {
		let [radius, height] = shellProfile[ringIndex], angle = (segmentIndex + ringIndex % 2 * .5) * Math.PI * 2 / shellSegments;
		return [
			radius * Math.cos(angle),
			height,
			radius * Math.sin(angle)
		];
	}
	function addTriangle(a, b, c) {
		shellColor.setHex(12497569).multiplyScalar(.94 + .06 * (.5 + .5 * Math.sin(shellPositions.length * 13.19))), shellPositions.push(...a, ...b, ...c);
		for (let vertexIndex = 0; vertexIndex < 3; vertexIndex++) shellColors.push(shellColor.r, shellColor.g, shellColor.b);
	}
	for (let ringIndex = 0; ringIndex < shellProfile.length - 1; ringIndex++) for (let segmentIndex = 0; segmentIndex < shellSegments; segmentIndex++) {
		let lowerA = shellVertex(ringIndex, segmentIndex), lowerB = shellVertex(ringIndex, segmentIndex + 1), upperA = shellVertex(ringIndex + 1, segmentIndex), upperB = shellVertex(ringIndex + 1, segmentIndex + (ringIndex % 2 ? -1 : 1));
		ringIndex % 2 ? (addTriangle(lowerA, upperB, upperA), addTriangle(lowerA, upperA, lowerB)) : (addTriangle(lowerA, upperA, lowerB), addTriangle(lowerB, upperA, upperB));
	}
	for (let segmentIndex = 0; segmentIndex < shellSegments; segmentIndex++) addTriangle(shellVertex(shellProfile.length - 1, segmentIndex), [
		0,
		3.49,
		0
	], shellVertex(shellProfile.length - 1, segmentIndex + 1));
	let shellGeometry = new THREE.BufferGeometry();
	shellGeometry.setAttribute("position", new THREE.Float32BufferAttribute(shellPositions, 3)), shellGeometry.setAttribute("color", new THREE.Float32BufferAttribute(shellColors, 3)), shellGeometry.computeVertexNormals();
	let legGeometry = new THREE.BoxGeometry(.25, 1, .25), footGeometry = new THREE.BoxGeometry(.65, .12, .65), foundationGeometry = new THREE.CylinderGeometry(3.65, 3.66, .24, 32), airlockGeometry = new THREE.CylinderGeometry(.89, .89, 1.54, 24, 1, !0), hatchGeometry = new THREE.CylinderGeometry(.69, .69, .07, 24), domeCenters = [
		-9,
		0,
		9
	], domeRadius = 3.65, floorY = Math.max(...domeCenters.flatMap((centerX) => [-3.8, 3.8].flatMap((dx) => [-3.65, 3.65].map((z) => plainHeight(centerX + dx, z))))) + .34, cabinetMaterial = new THREE.MeshStandardMaterial({
		color: 13288113,
		roughness: .86
	}), bedMaterial = new THREE.MeshStandardMaterial({
		color: 8885391,
		roughness: 1
	}), equipmentMaterial = new THREE.MeshStandardMaterial({
		color: 6712944,
		roughness: .49,
		metalness: .36
	}), windowMaterial = new THREE.MeshPhysicalMaterial({
		color: 9944516,
		transparent: !0,
		opacity: .34,
		roughness: .12,
		metalness: .15,
		side: THREE.DoubleSide,
		depthWrite: !1
	}), stripMaterial = new THREE.MeshBasicMaterial({ color: 16771517 });
	function addBox(parent, width, height, depth, material, x, y, z) {
		return addPart(parent, new THREE.BoxGeometry(width, height, depth), material, x, y, z);
	}
	function createDomeMaterial(domeIndex) {
		let material = shellMaterial.clone();
		return material.side = THREE.DoubleSide, material.onBeforeCompile = (shader) => {
			shader.vertexShader = `varying vec3 habitatPosition;
` + shader.vertexShader, shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
habitatPosition=position;`);
			let openings = [];
			domeIndex > 0 && openings.push("(habitatPosition.x < -2.4 && abs(habitatPosition.z) < .94 && habitatPosition.y < 2.44)"), domeIndex < 2 && openings.push("(habitatPosition.x > 2.4 && abs(habitatPosition.z) < .94 && habitatPosition.y < 2.44)"), openings.push("(habitatPosition.z > 2.3 && length((habitatPosition.xy-vec2(-1.24,1.56))/vec2(.32,.24))<1.0)"), openings.push("(habitatPosition.z > 2.3 && length((habitatPosition.xy-vec2(1.24,1.56))/vec2(.32,.24))<1.0)"), shader.fragmentShader = `varying vec3 habitatPosition;
` + shader.fragmentShader, shader.fragmentShader = shader.fragmentShader.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
if(` + openings.join(" || ") + ")discard;");
		}, material.customProgramCacheKey = () => "habitat-" + domeIndex, material;
	}
	for (let [domeIndex, centerX] of domeCenters.entries()) {
		let dome = new THREE.Group();
		dome.position.set(centerX, floorY, 0), addBox(dome, 8.2, .18, 8.2, floorMaterial, 0, -.11, 0), addPart(dome, foundationGeometry, sandMaterial, 0, -.11, 0), addPart(dome, shellGeometry, createDomeMaterial(domeIndex), 0, 0, 0).scale.y = domeIndex === 1 ? 1.28 : .94;
		for (let offset of [-3.75, 3.75]) for (let coordinate of [-3.75, 3.75]) {
			let part = plainHeight(centerX + offset, coordinate) - floorY, legLength = Math.max(.08, -part - .14);
			addPart(dome, legGeometry, metalMaterial, offset, part + legLength / 2, coordinate).scale.y = legLength, addPart(dome, footGeometry, floorMaterial, offset, part + .035, coordinate);
		}
		let rimMaterial = new THREE.MeshStandardMaterial({
			color: 4741474,
			roughness: .79
		});
		addPart(dome, new THREE.CylinderGeometry(3.659, 3.661, .115, 48, 1, !0), rimMaterial, 0, .46, 0);
		for (let offset = 0; offset < 10; offset++) {
			let coordinate = offset * Math.PI / 5, part = addBox(dome, .12, .53, .047, metalMaterial, 3.58 * Math.cos(coordinate), .54, 3.58 * Math.sin(coordinate));
			part.rotation.y = Math.PI / 2 - coordinate;
		}
		for (let offset = 0; offset < shellSegments; offset++) {
			let coordinate = offset * Math.PI * 2 / shellSegments, part = addPart(dome, new THREE.BoxGeometry(.048, .06, .025), metalMaterial, 3.64 * Math.cos(coordinate), .38, 3.64 * Math.sin(coordinate));
			part.rotation.y = Math.PI / 2 - coordinate;
		}
		for (let offset of [-1, 1]) {
			let coordinate = addPart(dome, new THREE.TorusGeometry(.29, .047, 8, 28), metalMaterial, offset * 1.24, 1.56 * (domeIndex === 1 ? 1.28 : .94), 3.08);
			coordinate.scale.x = 1.17, addPart(dome, new THREE.SphereGeometry(1, 24, 16), windowMaterial, offset * 1.24, 1.56 * (domeIndex === 1 ? 1.28 : .94), 3.02).scale.set(.35, .27, .47);
		}
		addBox(dome, 1.7, .055, .22, stripMaterial, 0, 2.83, -.5);
		let interiorLight = new THREE.PointLight(16770744, 10, 6);
		if (interiorLight.position.set(0, 2.65, -.35), interiorLight.castShadow = false, dome.add(interiorLight), domeIndex === 0) for (let offset of [
			-1,
			0,
			1
		]) addBox(dome, .66, 1.75, .21, bedMaterial, offset, 1.02, -2.38), addBox(dome, .74, .11, .43, equipmentMaterial, offset, .13, -2.38);
		else if (domeIndex === 1) addBox(dome, 2.3, 1.05, .63, cabinetMaterial, 0, .53, -2.45), addBox(dome, .55, .29, .39, equipmentMaterial, -.66, 1.2, -2.43), addBox(dome, .44, .52, .32, equipmentMaterial, .61, 1.31, -2.51), addBox(dome, .13, .1, .13, metalMaterial, .61, 1.15, -2.29);
		else for (let offset of [-.62, .62]) {
			addBox(dome, 1.1, 1.82, .62, cabinetMaterial, offset, .91, -2.25);
			for (let coordinate of [
				.43,
				.85,
				1.27,
				1.61
			]) addBox(dome, .83, .22, .045, equipmentMaterial, offset, coordinate, -1.93);
		}
		if (domeIndex === 1) {
			addPart(dome, new THREE.CylinderGeometry(.025, .038, 1.58, 12), metalMaterial, -.5, 5.08, -.18), addPart(dome, new THREE.CylinderGeometry(.05, .064, .81, 12), metalMaterial, .42, 4.7, -.35);
			let offset = addPart(dome, airlockGeometry, sandMaterial, 0, 1.01, 3.85);
			offset.rotation.x = Math.PI / 2, addPart(dome, hatchGeometry, hatchMaterial, 0, 1.01, 4.66).rotation.x = Math.PI / 2;
		}
		dome.traverse((offset) => {
			offset.isMesh && offset.material !== windowMaterial && (offset.castShadow = !0, offset.receiveShadow = !0);
		}), habitat.add(dome);
	}
	let tunnelMaterial = new THREE.MeshStandardMaterial({
		color: 10855836,
		roughness: .66,
		metalness: .26,
		side: THREE.DoubleSide
	});
	for (let centerX of [-4.5, 4.5]) {
		let tunnel = addPart(habitat, new THREE.CylinderGeometry(1.27, 1.27, 4.05, 32, 1, !0), tunnelMaterial, centerX, floorY + 1.19, 0);
		tunnel.rotation.z = Math.PI / 2, tunnel.castShadow = tunnel.receiveShadow = !0, addBox(habitat, 4.1, .14, 1.57, floorMaterial, centerX, floorY - .025, 0);
		for (let ringOffset of [
			-1.65,
			-1.1,
			-.55,
			0,
			.55,
			1.1,
			1.65
		]) addPart(habitat, new THREE.TorusGeometry(1.275, .044, 8, 32), metalMaterial, centerX + ringOffset, floorY + 1.19, 0).rotation.y = Math.PI / 2;
	}
	let entryZ = 5.35, rampGroundY = plainHeight(0, 6.25) + .02, ramp = addBox(habitat, 1.4, .12, Math.hypot(1.65, floorY - rampGroundY), floorMaterial, 0, (floorY + rampGroundY) / 2, 5.425);
	ramp.rotation.x = Math.atan2(floorY - rampGroundY, 1.65);
	let isInsideFloor = (x, z) => domeCenters.some((centerX) => Math.hypot(x - centerX, z) < domeRadius - .33) || Math.abs(z) < .73 && Math.abs(x) < 9, isHabitatBlocked = (x, z) => domeCenters.some((centerX) => Math.hypot(x - centerX, z) < domeRadius + .25) || Math.abs(z) < 1.46 && Math.abs(x) < 9, tower = new THREE.Group(), strutGeometry = new THREE.CylinderGeometry(.033, .044, 1, 8), addStrut = (x, z) => {
		let centerX = z.clone().sub(x), strut = addPart(tower, strutGeometry, metalMaterial, ...x.clone().lerp(z, .5).toArray());
		strut.scale.y = centerX.length(), strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), centerX.normalize());
	};
	for (let level = 0; level < 8; level++) for (let side of [-1, 1]) addStrut(new THREE.Vector3(side * .26, level, 0), new THREE.Vector3(side * .26, level + 1, 0)), addStrut(new THREE.Vector3(side * .26, level, 0), new THREE.Vector3(-side * .26, level + 1, 0));
	for (let offsetX of [-2.2, 2.2]) {
		let baseY = plainHeight(-14 + offsetX, -1) - plainHeight(-14, -1);
		addStrut(new THREE.Vector3(offsetX, baseY, 0), new THREE.Vector3(0, 6.5, 0)), addBox(tower, .15, 1, .26, sandMaterial, offsetX / 4, 7.1, .08);
	}
	addPart(tower, strutGeometry, metalMaterial, 0, 8.6, 0).scale.y = 1.4, placeHardware(tower, -14, -1);
	scene.add(habitat);
	habitat.name = "Ova_pressurised_habitat";
	// Circle/AABB overlap reserves the complete dome footprint, including wide modules.
	function blocksFootprint(x,z,halfX,halfZ) {
		return domeCenters.some(centerX => Math.hypot(Math.max(0,Math.abs(x-centerX)-halfX),Math.max(0,Math.abs(z)-halfZ)) < domeRadius+.4) ||
			(Math.abs(x)<9+halfX && Math.abs(z)<1.46+halfZ) ||
			(Math.abs(x)<.95+halfX && z+halfZ>3 && z-halfZ<6.3);
	}
	return {
		habitat,
		obstacles,
		floorY,
		entryZ,
		isInsideFloor,
		isHabitatBlocked,
		blocksFootprint,
		dispose() {
			shellMaterial.dispose();
		}
	};
}
