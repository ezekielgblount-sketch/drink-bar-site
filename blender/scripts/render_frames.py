"""Render every frame of a drink at final quality. Safe to re-run: frames already on disk are skipped.
   blender -b <drink>.blend -P render_frames.py -- [samples]

Note: Blender does NOT store "use the GPU" in the .blend file (it's a user preference),
so it has to be switched on here every run, or Cycles silently falls back to the CPU.
"""
import bpy, sys
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

prefs = bpy.context.preferences.addons["cycles"].preferences
for dev_type in ("OPTIX", "CUDA"):
    try:
        prefs.compute_device_type = dev_type
    except TypeError:
        continue
    prefs.get_devices()
    gpus = [d for d in prefs.devices if d.type == dev_type]
    if gpus:
        for d in prefs.devices:
            d.use = d.type == dev_type
        print("GPU RENDER:", dev_type, [d.name for d in gpus])
        break

sc = bpy.context.scene
sc.cycles.device = "GPU"
sc.cycles.samples = int(argv[0]) if argv else 160
sc.render.resolution_percentage = 100
sc.render.use_overwrite = False   # skip frames that already exist
sc.render.use_placeholder = True  # claim a frame before rendering it
bpy.ops.render.render(animation=True)
print("ALL FRAMES DONE", sc.frame_start, sc.frame_end)
