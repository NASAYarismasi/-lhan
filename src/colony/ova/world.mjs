/**
* Düz Ova world by İhan. Recovered from MARS-KOLONISI-DUZ-OVA.html
* (NASAYarismasi/-lhan, commit d6caf78); adapted to shared Three.js/environment.
* Dimensions, textures and layout below are artistic GAME ASSUMPTIONS, not surveyed Mars data.
*/
import * as THREE from "three";
import { plainHeight, createPlainTextures, createRegolithDetail } from "./terrain.mjs";
import { createHabitat } from "./habitat.mjs";
import { createSolarFarm } from "./solar.mjs";
export function createOvaWorld(scene) {
	let terrainSize = 620, terrainSegments = 96, groundGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
	groundGeometry.rotateX(-Math.PI / 2);
	let groundPositions = groundGeometry.attributes.position;
	for (let index = 0; index < groundPositions.count; index++) {
		let x = groundPositions.getX(index), z = groundPositions.getZ(index), height = plainHeight(x, z);
		groundPositions.setY(index, height);
	}
	groundGeometry.computeVertexNormals();
	let terrainRadius = terrainSize / 2, { albedoTexture, bumpTexture } = createPlainTextures(!1, terrainRadius), groundMaterial = new THREE.MeshStandardMaterial({
		map: albedoTexture,
		bumpMap: bumpTexture,
		bumpScale: .42,
		roughness: 1,
		metalness: .02
	}), detailTexture = createRegolithDetail();
	groundMaterial.onBeforeCompile = (I) => {
		I.uniforms.uDetailMap = { value: detailTexture }, I.uniforms.uDetailScale = { value: 84 }, I.fragmentShader = I.fragmentShader.replace("#include <common>", `#include <common>
uniform sampler2D uDetailMap;
uniform float uDetailScale;`).replace("#include <map_fragment>", `#include <map_fragment>
        float dA = texture2D(uDetailMap, vMapUv * uDetailScale).r;
        float dB = texture2D(uDetailMap, vMapUv * uDetailScale * 3.17 + vec2(0.37, 0.11)).r;
        float dGrain = dA * 0.66 + dB * 0.34;
        diffuseColor.rgb *= 0.62 + dGrain * 0.82;`);
	}, groundMaterial.customProgramCacheKey = () => "mars-regolith-detail-v1";
	let ground = new THREE.Mesh(groundGeometry, groundMaterial);
	ground.receiveShadow = !0, ground.castShadow = !1, scene.add(ground);
	let horizon = new THREE.Group(), nearHillMaterial = new THREE.MeshStandardMaterial({
		color: 10316627,
		roughness: 1,
		metalness: 0,
		flatShading: !0
	}), farHillMaterial = new THREE.MeshStandardMaterial({
		color: 11569775,
		roughness: 1,
		metalness: 0,
		flatShading: !0
	}), hillGeometry = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hillSeed = 4711, hillRandom = () => (hillSeed = Math.imul(hillSeed, 1664525) + 1013904223 >>> 0, hillSeed / 4294967296);
	for (let layer = 0; layer < 2; layer++) {
		let ringRadius = layer === 0 ? 250 : 390;
		for (let index = 0; index < 54; index++) {
			let angle = index / 54 * Math.PI * 2 + hillRandom() * .09, radius = ringRadius + hillRandom() * (layer === 0 ? 55 : 90), width = (layer === 0 ? 34 : 60) + hillRandom() * (layer === 0 ? 45 : 80), height = (layer === 0 ? 3 : 6) + hillRandom() * (layer === 0 ? 5 : 11), hill = new THREE.Mesh(hillGeometry, layer === 0 ? nearHillMaterial : farHillMaterial);
			hill.scale.set(width, height, width * (.5 + hillRandom() * .5)), hill.position.set(Math.cos(angle) * radius, -height * .18, Math.sin(angle) * radius), hill.rotation.y = hillRandom() * Math.PI, hill.receiveShadow = !0, horizon.add(hill);
		}
	}
	scene.add(horizon);
	let rockMaterial = new THREE.MeshStandardMaterial({
		color: 16777215,
		roughness: 1,
		metalness: .03,
		flatShading: !0
	}), slabMaterial = new THREE.MeshStandardMaterial({
		color: 16777215,
		roughness: 1,
		metalness: .02
	}), gravelMaterial = new THREE.MeshStandardMaterial({
		color: 16777215,
		roughness: 1,
		metalness: .02,
		flatShading: !0
	}), rockPose = new THREE.Object3D(), rockColor = new THREE.Color(), rockBatches = [], rockSeed = 8831;
	function rockRandom() {
		return rockSeed = Math.imul(rockSeed, 1664525) + 1013904223 >>> 0, rockSeed / 4294967296;
	}
	function scatterRocks(instances, count, config) {
		let tints = [], index = 0, attempts = 0;
		for (; index < count && attempts < count * 20;) {
			attempts++;
			let angle = rockRandom() * Math.PI * 2, radius = Math.sqrt(rockRandom()) * config.radius, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
			if (Math.hypot(x, z) < config.pad) continue;
			let scale = config.minScale + Math.pow(rockRandom(), 2.6) * (config.maxScale - config.minScale);
			rockPose.position.set(x, plainHeight(x, z) + scale * (.32 - config.bury), z);
			let tilt = config.tilt === void 0 ? Math.PI : config.tilt;
			rockPose.rotation.set((rockRandom() - .5) * tilt, rockRandom() * Math.PI * 2, (rockRandom() - .5) * tilt), rockPose.scale.set(scale, scale * config.flat * (.5 + rockRandom() * .6), scale * (.7 + rockRandom() * .6)), rockPose.updateMatrix(), instances.setMatrixAt(index, rockPose.matrix), tints.push({
				pick: Math.floor(rockRandom() * config.palette.length),
				light: (rockRandom() - .5) * .12
			}), index++;
		}
		instances.count = index, instances.instanceMatrix.needsUpdate = !0, instances.castShadow = !0, instances.receiveShadow = !0, instances.userData.tints = tints, instances.userData.palette = config.palette, rockBatches.push(instances), scene.add(instances);
	}
	function tintRocks(moon) {
		for (let batch of rockBatches) {
			let palette = moon ? [
				7303286,
				8619146,
				10132385,
				6053219,
				9079697
			] : batch.userData.palette;
			batch.userData.tints.forEach((tint, index) => {
				rockColor.setHex(palette[tint.pick % palette.length]), rockColor.offsetHSL(0, 0, tint.light), batch.setColorAt(index, rockColor);
			}), batch.instanceColor && (batch.instanceColor.needsUpdate = !0);
		}
	}
	let rockPalette = [
		9069392,
		10253408,
		11043432,
		7622719,
		11901571
	], slabPalette = [
		9398870,
		10517605,
		8017734,
		11636857,
		7163199
	], gravelPalette = [
		8214343,
		9859162,
		11110253,
		6965820
	];
	scatterRocks(new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), rockMaterial, 500), 500, {
		minScale: .16,
		maxScale: 1.9,
		flat: 1,
		radius: 280,
		bury: .34,
		pad: 30,
		palette: rockPalette
	}), scatterRocks(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1, 2, 1, 2), slabMaterial, 350), 350, {
		minScale: .4,
		maxScale: 2.6,
		flat: .16,
		radius: 240,
		bury: .42,
		pad: 28,
		palette: slabPalette,
		tilt: .22
	}), scatterRocks(new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), gravelMaterial, 2200), 2200, {
		minScale: .035,
		maxScale: .26,
		flat: .7,
		radius: 140,
		bury: .42,
		pad: 12,
		palette: gravelPalette,
		tilt: 1.1
	}), scatterRocks(new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), gravelMaterial, 3500), 3500, {
		minScale: .02,
		maxScale: .11,
		flat: .65,
		radius: 58,
		bury: .45,
		pad: 8,
		palette: gravelPalette,
		tilt: 1.3
	}), tintRocks(!1);
	const complex = createHabitat(scene);
	const { habitat, obstacles, floorY, entryZ, isInsideFloor, isHabitatBlocked } = complex;
	const solar = createSolarFarm(scene, plainHeight, obstacles);
	scene.add(habitat);
	ground.name = "Ova_plain";
	// Match rendered triangles so feet and module foundations never float above the plain.
	const stride = terrainSegments + 1;
	ground.userData.heightAt = (x, z) => {
		const u = THREE.MathUtils.clamp((x / terrainSize + .5) * terrainSegments, 0, terrainSegments - 1e-6);
		const v = THREE.MathUtils.clamp((z / terrainSize + .5) * terrainSegments, 0, terrainSegments - 1e-6);
		const ix = Math.floor(u), iz = Math.floor(v), a = u - ix, b = v - iz;
		const h00 = groundPositions.getY(iz * stride + ix), h10 = groundPositions.getY(iz * stride + ix + 1);
		const h01 = groundPositions.getY((iz + 1) * stride + ix), h11 = groundPositions.getY((iz + 1) * stride + ix + 1);
		return a + b < 1 ? h00 + (h10 - h00) * a + (h01 - h00) * b : h11 + (h01 - h11) * (1 - a) + (h10 - h11) * (1 - b);
	};
	habitat.name = "Ova_pressurised_habitat";
	horizon.name = "Ova_horizon";
	return {
		ground,
		habitat,
		obstacles,
		floorY,
		entryZ,
		isInsideFloor,
		isHabitatBlocked,
		blocksFootprint(x,z,halfX,halfZ) {
			return complex.blocksFootprint(x,z,halfX,halfZ) || obstacles.some(box =>
				x+halfX>box.min.x && x-halfX<box.max.x && z+halfZ>box.min.z && z-halfZ<box.max.z);
		},
		views: {
			panorama: {
				position: [
					1.6,
					plainHeight(1.6, 27) + 2.5,
					27
				],
				target: [
					0,
					floorY + 2.35,
					1
				]
			},
			base: {
				position: [
					15,
					5,
					17
				],
				target: [
					0,
					1,
					0
				]
			},
			solar: {
				position: [
					solar.x0 + 30,
					solar.level + 36,
					solar.z0 + 46
				],
				target: [
					solar.x0,
					solar.level,
					solar.z0
				]
			},
			pad: {
				position: [
					29,
					35,
					35
				],
				target: [
					0,
					0,
					18
				]
			}
		},
		dispose() {
			detailTexture.dispose();
			complex.dispose();
		}
	};
}
