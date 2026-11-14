"""Bake a rigid, unrigged NASA suit into a seated pose (Blender CLI)."""
import bpy
import math
import os
from mathutils import Vector, Matrix

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='public/assets/astronaut.glb')
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
points = [o.matrix_world @ v.co for o in objects for v in o.data.vertices]
lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
scale = 1.85 / (hi.z-lo.z)
for o in objects:
    transform = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
    for v in o.data.vertices:
        p = transform @ v.co
        v.co = Vector(((p.x-(lo.x+hi.x)/2)*scale, (p.y-(lo.y+hi.y)/2)*scale, (p.z-lo.z)*scale))

# Optional diagnostic view, before baking.
import sys
inspect = '--inspect' in sys.argv
if not inspect:
    # Original suit faces -Y in Blender. Bend legs forward at the hip, then
    # bend the shins down at the knee. Arms rotate as complete limb regions.
    for o in objects:
        for v in o.data.vertices:
            p = v.co.copy()
            if abs(p.x) > .29 and p.z > 1.02:
                side = 1 if p.x > 0 else -1
                shoulder = Vector((side*.235, 0, 1.40))
                p = shoulder + Matrix.Rotation(side*math.radians(78), 3, 'Y') @ (p-shoulder)
                # Elbows tucked alongside the torso; hands lie over the thighs.
                if p.z < 1.03:
                    elbow = Vector((side*.36, 0, 1.05))
                    p = elbow + Matrix.Rotation(math.radians(-65), 3, 'X') @ (p-elbow)
            elif p.z < .91:
                hip = Vector((p.x, 0, .91))
                if p.z < .46:
                    knee = Vector((p.x, 0, .46))
                    p = knee + Matrix.Rotation(math.radians(88), 3, 'X') @ (p-knee)
                p = hip + Matrix.Rotation(math.radians(-88), 3, 'X') @ (p-hip)
            # Recline the entire seated body 24 degrees from vertical.
            pivot = Vector((0,0,.91))
            v.co = pivot + Matrix.Rotation(math.radians(-24), 3, 'X') @ (p-pivot)
        o.data.update()
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.abspath('public/assets/astronaut-seated.glb'), export_format='GLB', use_selection=True)

# Orthographic asset QA: front three-quarter view.
bpy.ops.object.camera_add(location=(2.8,-4.5,2.5))
camera = bpy.context.object
camera.rotation_euler = (Vector((0,0,.95))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
camera.data.ortho_scale=2.6
bpy.context.scene.camera=camera
scene=bpy.context.scene
scene.render.engine='BLENDER_WORKBENCH'
scene.display.shading.light='STUDIO'
scene.display.shading.color_type='MATERIAL'
scene.display.shading.show_shadows=True
scene.display.shading.show_cavity=True
scene.render.resolution_x=700
scene.render.resolution_y=700
scene.render.resolution_percentage=100
os.makedirs('output', exist_ok=True)
scene.render.filepath=os.path.abspath('output/crew-original.png' if inspect else 'output/crew-seated.png')
bpy.ops.render.render(write_still=True)
