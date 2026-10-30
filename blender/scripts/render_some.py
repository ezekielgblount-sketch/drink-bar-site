"""Render a few specific frames at preview quality: blender -b file.blend -P render_some.py -- 20 45 130"""
import bpy, os, sys
frames = [int(x) for x in sys.argv[sys.argv.index("--") + 1:]]
sc = bpy.context.scene
sc.cycles.samples = 64
sc.render.resolution_percentage = 50
base = os.path.join(os.path.dirname(bpy.data.filepath), "renders")
name = os.path.splitext(os.path.basename(bpy.data.filepath))[0]
for f in frames:
    sc.frame_set(f)
    sc.render.filepath = os.path.join(base, f"preview_{name}_{f:03d}.png")
    bpy.ops.render.render(write_still=True)
    print("PREVIEW", f)
