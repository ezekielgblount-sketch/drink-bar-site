"""
Builds one photo-real drink scene in Blender and saves it as a .blend.

Run headless:
  blender -b -P build_drink.py -- --drink sol-de-mango [--test-frame 100 --samples 64]

Timeline (frames):
  1-72    pour: stream falls in, liquid rises around the ice
  74-92   garnish drops onto the rim
  96-168  full 360° turn
All sizes are real-world meters (a rocks glass is ~9 cm tall) so glass and light behave correctly.
"""
import bpy, bmesh, math, sys, os, random
from mathutils import Vector, Matrix

# ---------- settings ----------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../blender
ASSETS = os.path.join(ROOT, "assets")
RENDERS = os.path.join(ROOT, "renders")

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default

DRINK = arg("--drink", "sol-de-mango")
TEST_FRAME = arg("--test-frame")
SAMPLES = int(arg("--samples", "256"))

F_POUR = (1, 72)
F_GARNISH = (74, 92)
F_SPIN = (96, 168)

DRINKS = {
    "sol-de-mango": dict(
        glass="rocks", liquid=(1.0, 0.66, 0.02), liquid_kind="puree", fill=0.62,
        rim="chili", garnish="mango", ice=True, drops=True,
    ),
    "classic-margarita": dict(  # served up in a coupe, salt rim, lime wheel
        glass="coupe", liquid=(0.92, 0.95, 0.62), liquid_kind="cloudy", dens=(14, 26), fill=0.78,
        rim="salt", garnish="lime", ice=False, drops=False,
    ),
    "tommys-margarita": dict(  # rocks, no rim, lime wheel; agave makes it golden
        glass="rocks", liquid=(0.97, 0.86, 0.48), liquid_kind="cloudy", dens=(16, 14), fill=0.6,
        rim=None, garnish="lime", ice=True, drops=True,
    ),
    "paloma": dict(  # tall, salt rim, grapefruit wheel, sparkling pink
        glass="highball", liquid=(1.0, 0.66, 0.62), liquid_kind="cloudy", dens=(12, 16), fill=0.84,
        rim="salt", garnish="grapefruit", ice=True, drops=True, fizz=True,
    ),
    "ranch-water": dict(  # tall, crystal clear and sparkling, lime wheel
        glass="highball", liquid=(0.93, 0.99, 0.94), liquid_kind="clear", dens=(3, 0), fill=0.86,
        rim=None, garnish="lime", ice=True, drops=True, fizz=True,
    ),
}
CFG = DRINKS[DRINK]
random.seed(7)

# ---------- helpers ----------
def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def lin(c):
    """sRGB 0-1 -> linear, for colors typed by eye."""
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links

def principled(m):
    return m.node_tree.nodes["Principled BSDF"]

def revolve(name, profile, steps=96):
    """Spin a side profile [(r, z), ...] around Z into a closed, smooth solid."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new((r, 0, z)) for r, z in profile]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1),
                   angle=math.tau, steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    return ob

def add_subsurf(ob, levels=2):
    mod = ob.modifiers.new("Smooth", "SUBSURF")
    mod.levels = levels
    mod.render_levels = levels
    return mod

def link(ob, parent):
    ob.parent = parent
    return ob

def key(ob, path, frame, value=None, interp=None):
    if value is not None:
        setattr(ob, path, value) if not isinstance(value, (tuple, list)) else setattr(ob, path, value)
    ob.keyframe_insert(data_path=path, frame=frame)
    if interp and ob.animation_data and ob.animation_data.action:
        for fc in fcurves_of(ob):
            for kp in fc.keyframe_points:
                if int(kp.co[0]) == frame:
                    kp.interpolation = interp

def fcurves_of(ob):
    """Animation curves of an object (Blender 5 keeps them in 'channel bags' per action slot)."""
    ad = ob.animation_data
    if not ad or not ad.action:
        return []
    try:
        from bpy_extras.anim_utils import action_get_channelbag_for_slot
        cb = action_get_channelbag_for_slot(ad.action, ad.action_slot)
        return list(cb.fcurves) if cb else []
    except ImportError:
        return list(ad.action.fcurves)

def ease(t):  # smooth start and stop
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

# ---------- glass shapes (meters) ----------
def tumbler(H, rb, rt, wall, base):
    """Straight, slightly tapered glass (rocks, highball) with a heavy base."""
    r_at = lambda z: rb + (rt - rb) * z / H
    prof = [
        (0.0, 0.0), (rb * 0.75, 0.0), (rb - 0.0015, 0.0), (rb - 0.0004, 0.0006), (rb, 0.0020),
        (r_at(0.004), 0.004), (r_at(H * 0.5), H * 0.5), (r_at(H - 0.003), H - 0.003),
        (rt, H - 0.0008), (rt - wall * 0.25, H), (rt - wall * 0.75, H),
        (rt - wall, H - 0.0008), (r_at(H - 0.003) - wall, H - 0.003),
        (r_at(H * 0.5) - wall, H * 0.5), (r_at(base + 0.004) - wall, base + 0.004),
        (r_at(base) - wall - 0.0015, base + 0.0004), (r_at(base) - wall - 0.004, base),
        (rb * 0.5, base), (0.0, base),
    ]
    return prof, dict(H=H, floor=base, rt=rt, wall=wall, outer=r_at,
                      inner=lambda z: r_at(z) - wall, flat_floor=True, height=H, width=2 * rt)

def coupe():
    """Stemmed coupe: round foot, slim stem, wide shallow bowl."""
    zt, ro, ri, do, di = 0.135, 0.055, 0.0535, 0.050, 0.0485
    prof = [(0.0, 0.0), (0.036, 0.0), (0.0395, 0.0012), (0.0395, 0.0035), (0.036, 0.005),
            (0.010, 0.0075), (0.0055, 0.012), (0.0045, 0.03), (0.0045, 0.072), (0.0062, 0.082)]
    t0 = math.asin(0.0075 / ro)
    for i in range(1, 21):
        t = t0 + (math.pi / 2 - t0) * i / 20
        prof.append((ro * math.sin(t), zt - do * math.cos(t)))
    prof += [(ro - 0.0004, zt + 0.0005), (ri + 0.0004, zt + 0.0005)]  # rounded lip
    for i in range(20, -1, -1):
        t = (math.pi / 2) * i / 20
        prof.append((ri * math.sin(t), zt - di * math.cos(t)))
    inner = lambda z: ri * math.sqrt(max(0.0, 1 - ((zt - z) / di) ** 2))
    outer = lambda z: ro * math.sqrt(max(0.0, 1 - ((zt - z) / do) ** 2))
    return prof, dict(H=zt, floor=zt - di, rt=ro, wall=ro - ri, outer=outer, inner=inner,
                      flat_floor=False, height=zt + 0.001, width=2 * ro)

GLASSES = {
    "rocks": lambda: tumbler(0.092, 0.0400, 0.0455, 0.0024, 0.013),
    "highball": lambda: tumbler(0.150, 0.0310, 0.0340, 0.0022, 0.014),
    "coupe": coupe,
}

def liquid_profile(g, z_top):
    gap = 0.0002  # tiny air gap: avoids glass/liquid surfaces fighting in the render
    inner = lambda z: max(g["inner"](z) - gap, 0.0)
    b = g["floor"] + gap
    pts = [(0.0, b)]
    if g["flat_floor"]:
        pts += [(inner(b) - 0.004, b), (inner(b) - 0.0012, b + 0.0004)]
        start = b + 0.004
    else:
        start = b + 0.0005
    n = 16
    for i in range(n + 1):
        z = start + (z_top - start) * i / n
        pts.append((inner(z), z))
    pts.append((0.0, z_top))
    return pts

# ---------- materials ----------
def glass_material():
    m, nodes, links = new_mat("Glass")
    p = principled(m)
    p.inputs["Base Color"].default_value = (1, 1, 1, 1)
    p.inputs["Transmission Weight"].default_value = 1.0
    p.inputs["Roughness"].default_value = 0.0
    p.inputs["IOR"].default_value = 1.52
    return m

def liquid_material(color, kind):
    m, nodes, links = new_mat("Liquid")
    p = principled(m)
    p.inputs["Base Color"].default_value = (*lin(color), 1)
    p.inputs["Roughness"].default_value = 0.08
    p.inputs["IOR"].default_value = 1.34
    if kind == "puree":
        # Mango purée: creamy and glowing when backlit -> subsurface scattering.
        p.inputs["Subsurface Weight"].default_value = 1.0
        p.inputs["Subsurface Radius"].default_value = (1.0, 0.85, 0.45)
        p.inputs["Subsurface Scale"].default_value = 0.0025
    else:
        # See-through drinks: tinted by depth (absorption), hazy if cloudy (scatter).
        p.inputs["Transmission Weight"].default_value = 1.0
        p.inputs["Roughness"].default_value = 0.02
        absorb, scatter = CFG.get("dens", (18, 0))
        vol = nodes.new("ShaderNodeVolumeAbsorption")
        vol.inputs["Color"].default_value = (*lin(color), 1)
        vol.inputs["Density"].default_value = absorb
        out = vol.outputs[0]
        if scatter:
            sc = nodes.new("ShaderNodeVolumeScatter")
            sc.inputs["Color"].default_value = (*lin(tuple(min(1, c * 1.05) for c in color)), 1)
            sc.inputs["Density"].default_value = scatter
            add = nodes.new("ShaderNodeAddShader")
            links.new(vol.outputs[0], add.inputs[0])
            links.new(sc.outputs[0], add.inputs[1])
            out = add.outputs[0]
        links.new(out, nodes["Material Output"].inputs["Volume"])
    return m

WHEEL_R = {"lime": 0.026, "grapefruit": 0.031}

def citrus_wheel_material(kind):
    """Citrus wheel face drawn pixel by pixel: rind, pith, juicy segments, white membranes."""
    flesh, pith, rind = {
        "lime": ((0.70, 0.80, 0.36), (0.93, 0.95, 0.82), (0.18, 0.38, 0.06)),
        "grapefruit": ((0.95, 0.36, 0.33), (0.98, 0.92, 0.85), (0.93, 0.55, 0.25)),
    }[kind]
    size = 512
    img = bpy.data.images.new(f"{kind}_wheel", size, size, alpha=False)
    px = [0.0] * (size * size * 4)
    segs = 10
    for j in range(size):
        for i in range(size):
            x = (i + 0.5) / size * 2 - 1
            y = (j + 0.5) / size * 2 - 1
            r = math.hypot(x, y)
            a = math.atan2(y, x)
            if r > 0.93:
                c = rind
            elif r > 0.85:
                c = pith
            else:
                membrane = abs(math.sin(a * segs / 2)) < 0.06 + 0.02 * (1 - r)
                core = r < 0.11
                # Juice sacs: fine radial streaks plus a little grain, like real pulp.
                grain = (math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1.0
                k_ = 0.86 + 0.08 * math.sin(a * 140) * r + 0.08 * grain
                c = pith if (membrane or core) else tuple(v * k_ for v in flesh)
            k = (j * size + i) * 4
            px[k:k + 4] = [*lin(c), 1.0]
    img.pixels = px
    img.pack()
    m, nodes, links = new_mat(f"{kind.title()}Wheel")
    p = principled(m)
    coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    R = WHEEL_R[kind]
    mapping.inputs["Scale"].default_value = (0.5 / R, 0.5 / R, 1)
    mapping.inputs["Location"].default_value = (0.5, 0.5, 0)
    links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.extension = "EXTEND"
    links.new(mapping.outputs["Vector"], tex.inputs["Vector"])
    links.new(tex.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Subsurface Weight"].default_value = 0.35
    # Light scattering inside the fruit takes the fruit's own color (default is red-orange).
    p.inputs["Subsurface Radius"].default_value = {"lime": (0.55, 1.0, 0.25), "grapefruit": (1.0, 0.45, 0.4)}[kind]
    p.inputs["Subsurface Scale"].default_value = 0.002
    p.inputs["Roughness"].default_value = 0.25
    p.inputs["Coat Weight"].default_value = 0.7  # wet and juicy
    p.inputs["Coat Roughness"].default_value = 0.05
    return m

def bubble_material():
    m, nodes, links = new_mat("Bubble")
    p = principled(m)
    p.inputs["Transmission Weight"].default_value = 1.0
    p.inputs["Roughness"].default_value = 0.0
    p.inputs["IOR"].default_value = 0.75  # air inside liquid
    return m

def ice_material():
    m, nodes, links = new_mat("Ice")
    p = principled(m)
    p.inputs["Base Color"].default_value = (0.95, 0.98, 1.0, 1)
    p.inputs["Transmission Weight"].default_value = 1.0
    p.inputs["IOR"].default_value = 1.31
    # Slightly uneven surface, like real melting ice.
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 180
    rough = nodes.new("ShaderNodeMapRange")
    rough.inputs["To Min"].default_value = 0.02
    rough.inputs["To Max"].default_value = 0.12
    links.new(noise.outputs["Fac"], rough.inputs["Value"])
    links.new(rough.outputs["Result"], p.inputs["Roughness"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.15
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], p.inputs["Normal"])
    # Cloudy core of frozen-in air.
    sc = nodes.new("ShaderNodeVolumeScatter")
    sc.inputs["Density"].default_value = 6.0
    links.new(sc.outputs[0], nodes["Material Output"].inputs["Volume"])
    return m

def water_drop_material():
    m, nodes, links = new_mat("Condensation")
    p = principled(m)
    p.inputs["Transmission Weight"].default_value = 1.0
    p.inputs["Roughness"].default_value = 0.0
    p.inputs["IOR"].default_value = 1.33
    return m

def rim_material(kind):
    m, nodes, links = new_mat("Rim")
    p = principled(m)
    info = nodes.new("ShaderNodeObjectInfo")
    ramp = nodes.new("ShaderNodeValToRGB")
    els = ramp.color_ramp.elements
    if kind == "chili":
        els[0].color = (*lin((0.70, 0.08, 0.02)), 1)  # chili red
        els[1].color = (*lin((0.93, 0.40, 0.04)), 1)  # paprika orange
        els[1].position = 0.55
        salt = els.new(0.78)
        salt.color = (*lin((0.97, 0.95, 0.92)), 1)  # salt crystals
        ramp.color_ramp.interpolation = "CONSTANT"  # each grain is one clear color
    else:
        els[0].color = (0.85, 0.85, 0.85, 1)
        els[1].color = (1, 1, 1, 1)
    links.new(info.outputs["Random"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.45
    p.inputs["Subsurface Weight"].default_value = 0.3
    p.inputs["Subsurface Scale"].default_value = 0.0005
    return m

def mango_materials():
    # Ripe mango flesh: deep golden-orange, juicy (glossy coat), fine fibers, light passes into it.
    flesh, nodes, links = new_mat("MangoFlesh")
    p = principled(flesh)
    p.inputs["Base Color"].default_value = (*lin((1.0, 0.72, 0.12)), 1)
    p.inputs["Subsurface Weight"].default_value = 0.15
    p.inputs["Subsurface Radius"].default_value = (1.0, 0.85, 0.5)
    p.inputs["Subsurface Scale"].default_value = 0.002
    p.inputs["Roughness"].default_value = 0.2
    p.inputs["Coat Weight"].default_value = 0.8
    p.inputs["Coat Roughness"].default_value = 0.05
    coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1, 1, 10)  # stretched noise = fibers
    links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    fib = nodes.new("ShaderNodeTexNoise")
    fib.inputs["Scale"].default_value = 260
    links.new(mapping.outputs["Vector"], fib.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.06
    links.new(fib.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], p.inputs["Normal"])

    # Skin: red blush fading to green-yellow.
    skin, nodes, links = new_mat("MangoSkin")
    p = principled(skin)
    grad = nodes.new("ShaderNodeTexNoise")
    grad.inputs["Scale"].default_value = 40
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*lin((0.62, 0.1, 0.04)), 1)
    ramp.color_ramp.elements[1].color = (*lin((0.55, 0.6, 0.12)), 1)
    links.new(grad.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.3
    p.inputs["Coat Weight"].default_value = 0.5
    return flesh, skin

def smooth_by_angle(ob, deg=35):
    """Smooth shading but keep real edges crisp (adds Blender's Smooth by Angle)."""
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(deg))
    except Exception as e:
        print("smooth_by_angle fallback:", e)
        bpy.ops.object.shade_smooth()
    ob.select_set(False)

def mango_wedge():
    """A crescent mango slice: straight cut edge on top, rounded skin underneath."""
    bm = bmesh.new()
    pts = []
    half, depth, n = 0.024, 0.016, 28
    for i in range(n + 1):  # skin arc, left to right underneath
        a = math.pi + math.pi * i / n
        pts.append((half * math.cos(a), -depth * abs(math.sin(a))))
    verts = [bm.verts.new((x, -0.006, z)) for x, z in pts]
    face = bm.faces.new(verts)  # chord closes the shape along the top
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    for v in [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]:
        v.co.y += 0.012
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        c = f.calc_center_median()
        side = abs(f.normal.y) < 0.5
        f.material_index = 1 if (side and c.z < -0.0015) else 0  # skin on the curved band only
    me = bpy.data.meshes.new("Mango")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("Mango", me)
    bpy.context.scene.collection.objects.link(ob)
    bev = ob.modifiers.new("Rounded", "BEVEL")
    bev.width = 0.0012
    bev.segments = 4
    add_subsurf(ob, 2)
    for p in me.polygons:
        p.use_smooth = True
    return ob

def bar_top_material():
    m, nodes, links = new_mat("BarTop")
    p = principled(m)
    coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1, 18, 1)
    links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    wave = nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 8
    wave.inputs["Distortion"].default_value = 9
    wave.inputs["Detail"].default_value = 4
    links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*lin((0.035, 0.018, 0.009)), 1)
    ramp.color_ramp.elements[1].color = (*lin((0.11, 0.055, 0.025)), 1)
    links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.35
    p.inputs["Coat Roughness"].default_value = 0.12
    # Fade: full wood near the glass, pure black (no shine) beyond ~25 cm.
    dist = nodes.new("ShaderNodeVectorMath")
    dist.operation = "LENGTH"
    links.new(coord.outputs["Object"], dist.inputs[0])
    fade = nodes.new("ShaderNodeMapRange")
    fade.inputs["From Min"].default_value = 0.07
    fade.inputs["From Max"].default_value = 0.26
    fade.inputs["To Min"].default_value = 1.0
    fade.inputs["To Max"].default_value = 0.0
    links.new(dist.outputs["Value"], fade.inputs["Value"])
    coat = nodes.new("ShaderNodeMath")
    coat.operation = "MULTIPLY"
    coat.inputs[1].default_value = 0.4
    links.new(fade.outputs["Result"], coat.inputs[0])
    links.new(coat.outputs["Value"], p.inputs["Coat Weight"])
    spec = nodes.new("ShaderNodeMath")
    spec.operation = "MULTIPLY"
    spec.inputs[1].default_value = 0.3
    links.new(fade.outputs["Result"], spec.inputs[0])
    links.new(spec.outputs["Value"], p.inputs["Specular IOR Level"])
    dark = nodes.new("ShaderNodeMix")
    dark.data_type = "RGBA"
    col_in = [i for i in dark.inputs if i.type == "RGBA"]
    col_out = [o for o in dark.outputs if o.type == "RGBA"][0]
    col_in[1].default_value = (*lin((0.043, 0.031, 0.024)), 1)
    links.new(ramp.outputs["Color"], col_in[0])
    inv = nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    links.new(fade.outputs["Result"], inv.inputs[1])
    links.new(inv.outputs["Value"], dark.inputs["Factor"])
    links.new(col_out, p.inputs["Base Color"])
    return m

# ---------- world and lights ----------
def setup_world():
    w = bpy.data.worlds.new("Bar")
    bpy.context.scene.world = w
    w.use_nodes = True
    nodes, links = w.node_tree.nodes, w.node_tree.links
    bg = nodes["Background"]
    env = nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(ASSETS, "studio_small_09_2k.hdr"))
    links.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.12
    # Camera sees near-black (the page color); reflections and refractions still see the studio.
    dark = nodes.new("ShaderNodeBackground")
    dark.inputs["Color"].default_value = (*lin((0.043, 0.031, 0.024)), 1)
    lp = nodes.new("ShaderNodeLightPath")
    mix = nodes.new("ShaderNodeMixShader")
    links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
    links.new(bg.outputs[0], mix.inputs[1])
    links.new(dark.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], nodes["World Output"].inputs["Surface"])

def area(name, loc, rot_deg, size, energy, color=(1, 1, 1), shape="RECTANGLE"):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = shape
    if shape == "RECTANGLE":
        ld.size, ld.size_y = size
    else:
        ld.size = size[0]
    ld.energy = energy
    ld.color = color
    ob = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = [math.radians(a) for a in rot_deg]
    ob.visible_camera = False  # like a real shoot: lights shine and reflect, but are never in shot
    return ob

def aim(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

def setup_lights():
    # Warm key softbox, front-left and above.
    k = area("Key", (-0.35, -0.30, 0.42), (0, 0, 0), (0.35, 0.5), 14, (1.0, 0.84, 0.66))
    aim(k, (0, 0, 0.05))
    # Two tall strip lights behind: they draw the bright outlines of the glass on black.
    for side in (-1, 1):
        s = area(f"Rim{side}", (side * 0.22, 0.28, 0.10), (0, 0, 0), (0.05, 0.6), 40)
        aim(s, (0, 0, 0.05))
    # Low warm light behind the glass: makes the mango glow through.
    b = area("Back", (0.0, 0.32, 0.03), (0, 0, 0), (0.25, 0.12), 12, (1.0, 0.88, 0.6))
    aim(b, (0, 0, 0.04))
    # Soft overhead pendant for the top highlight on the liquid.
    t = area("Top", (0.05, -0.05, 0.55), (0, 0, 0), (0.2, 0.2), 10, (1.0, 0.9, 0.78), "DISK")
    aim(t, (0, 0, 0.05))

def setup_camera(g):
    cd = bpy.data.cameras.new("Camera")
    cd.lens = 85
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = 5.6
    cam = bpy.data.objects.new("Camera", cd)
    bpy.context.scene.collection.objects.link(cam)
    # Frame the whole glass plus room for the falling stream and garnish.
    span = max(g["height"] * 1.6, g["width"] * 2.1)
    dist = span * 85 / 36
    tz = g["height"] * 0.6
    cam.location = (0, -dist, tz + dist * 0.13)
    aim(cam, (0, 0, tz))
    target = bpy.data.objects.new("Focus", None)
    bpy.context.scene.collection.objects.link(target)
    target.location = (0, -0.02, g["height"] * 0.55)
    cd.dof.focus_object = target
    bpy.context.scene.camera = cam

def setup_render():
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for dev_type in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = dev_type
            prefs.get_devices()
            gpus = [d for d in prefs.devices if d.type == dev_type]
            if gpus:
                for d in prefs.devices:
                    d.use = d.type == dev_type
                break
        except TypeError:
            continue
    sc.cycles.device = "GPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.01
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 24
    sc.cycles.transmission_bounces = 20
    sc.cycles.glossy_bounces = 12
    sc.cycles.volume_bounces = 2
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.blur_glossy = 0.6  # tames fireflies from glass caustics
    sc.cycles.caustics_reflective = True
    sc.cycles.caustics_refractive = True
    sc.render.resolution_x = 1080
    sc.render.resolution_y = 1350
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "8"
    # Khronos PBR Neutral keeps food colors true (AgX drifts saturated orange toward pink).
    try:
        sc.view_settings.view_transform = "Khronos PBR Neutral"
    except TypeError:
        sc.view_settings.view_transform = "AgX"
    sc.frame_start, sc.frame_end = 1, F_SPIN[1]
    sc.render.fps = 30

# ---------- drink parts ----------
def build():
    clean_scene()
    setup_render()
    setup_world()
    setup_lights()
    prof, g = GLASSES[CFG["glass"]]()
    setup_camera(g)

    # Everything that turns during the spin hangs off this empty.
    drink = bpy.data.objects.new("Drink", None)
    bpy.context.scene.collection.objects.link(drink)

    # Bar top
    bpy.ops.mesh.primitive_plane_add(size=3, location=(0, 0, -0.0001))
    top = bpy.context.active_object
    top.name = "BarTop"
    top.data.materials.append(bar_top_material())

    # Glass
    glass = link(revolve("Glass", prof), drink)
    add_subsurf(glass, 2)
    glass.data.materials.append(glass_material())

    # Liquid: full shape, cut by a rising box so the level matches the tapered glass exactly.
    z_floor = g["floor"] + 0.0002
    z_full = g["floor"] + (g["H"] - g["floor"]) * CFG["fill"]
    liquid = link(revolve("Liquid", liquid_profile(g, z_full)), drink)
    liquid.data.materials.append(liquid_material(CFG["liquid"], CFG["liquid_kind"]))
    smooth_by_angle(liquid)
    bpy.ops.mesh.primitive_cube_add(size=1)
    cutter = bpy.context.active_object
    cutter.name = "LevelCutter"
    link(cutter, drink)
    cutter.hide_render = True
    cutter.display_type = "WIRE"
    cutter.scale = (0.2, 0.2, 0.2)
    boolean = liquid.modifiers.new("Level", "BOOLEAN")
    boolean.operation = "INTERSECT"
    boolean.solver = "EXACT"
    boolean.object = cutter

    def level_at(frame):
        t = ease((frame - F_POUR[0]) / (F_POUR[1] - F_POUR[0]))
        return z_floor + (z_full - z_floor) * t

    # The cutter's top face sits at the liquid level: key it every frame of the pour.
    for f in range(F_POUR[0], F_POUR[1] + 1):
        cutter.location = (0, 0, level_at(f) - 0.1)
        cutter.keyframe_insert("location", frame=f)
    liquid.hide_render = False

    # Pour stream: falls from above the frame onto the rising surface, rippling as it goes.
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1, depth=1)
    stream = bpy.context.active_object
    stream.name = "Stream"
    link(stream, drink)
    # Move the mesh so its top is at the object's origin and it hangs downward.
    for v in stream.data.vertices:
        v.co.z -= 0.5
    sub = stream.modifiers.new("Smooth", "SUBSURF")
    sub.levels = sub.render_levels = 1
    bpy.ops.object.shade_smooth()
    tex = bpy.data.textures.new("StreamRipples", "CLOUDS")
    tex.noise_scale = 0.004
    flow = bpy.data.objects.new("StreamFlow", None)
    bpy.context.scene.collection.objects.link(flow)
    disp = stream.modifiers.new("Ripples", "DISPLACE")
    disp.texture = tex
    disp.texture_coords = "OBJECT"
    disp.texture_coords_object = flow
    disp.strength = 0.0008
    stream.data.materials.append(bpy.data.materials["Liquid"])
    z_src = g["height"] + 0.17
    sx = {"rocks": 0.010, "highball": 0.008, "coupe": 0.012}[CFG["glass"]]  # a little off-center
    for f in range(F_POUR[0], F_POUR[1] + 1):
        thick = ease((f - F_POUR[0]) / 4) * (1 - ease((f - (F_POUR[1] - 6)) / 6))
        r = 0.0042 * max(thick, 0.001)
        stream.location = (sx, 0, z_src)
        stream.scale = (r, r, z_src - level_at(f) + 0.002)
        stream.keyframe_insert("location", frame=f)
        stream.keyframe_insert("scale", frame=f)
        flow.location = (0, 0, f * 0.012)  # ripples slide down the stream
        flow.keyframe_insert("location", frame=f)
    stream.hide_render = True
    stream.keyframe_insert("hide_render", frame=F_POUR[1] + 1)
    stream.hide_render = False
    stream.keyframe_insert("hide_render", frame=F_POUR[0])

    # Ice: big clear cubes resting in the glass (the drink is poured over ice).
    if CFG["ice"]:
        ice_mat = ice_material()
        cubes = [  # x, y, z, size, rotation
            (-0.014, 0.010, 0.0, 0.027, (4, 6, 18)),
            (0.016, -0.004, 0.0, 0.026, (-5, 3, -12)),
            (0.0, -0.018, 0.0, 0.025, (8, -4, 40)),
            (-0.004, 0.006, 1.0, 0.027, (22, 14, 25)),
            (0.012, -0.012, 1.0, 0.025, (-18, 10, -30)),
        ] if CFG["glass"] == "rocks" else [  # a tall stack in a highball
            ((0.004, -0.004)[i % 2], (-0.003, 0.004)[i % 2], float(i), 0.023,
             (6 * (i % 3), -5 * (i % 2), 12 * i))
            for i in range(5)
        ]
        for i, (x, y, layer, s, rot) in enumerate(cubes):
            bpy.ops.mesh.primitive_cube_add(size=s)
            c = bpy.context.active_object
            c.name = f"Ice{i}"
            z = g["floor"] + s * 0.55 + layer * s * 0.98  # top cubes rest on the ones below
            c.location = (x, y, z)
            c.rotation_euler = [math.radians(a) for a in rot]
            bev = c.modifiers.new("Rounded", "BEVEL")
            bev.width = s * 0.16
            bev.segments = 5
            add_subsurf(c, 1)
            d = c.modifiers.new("Melt", "DISPLACE")
            d.texture = bpy.data.textures.get("IceLumps") or bpy.data.textures.new("IceLumps", "CLOUDS")
            d.texture.noise_scale = 0.01
            d.strength = 0.0007
            bpy.ops.object.shade_smooth()
            c.data.materials.append(ice_mat)
            link(c, drink)

    # Chili-lime salt rim: thousands of tiny crystals stuck to the top outside edge.
    if CFG["rim"]:
        rim_band = revolve("RimBand", [
            (g["outer"](g["H"] - 0.0065) + 0.0003, g["H"] - 0.0065),
            (g["outer"](g["H"] - 0.0006) + 0.0003, g["H"] - 0.0006),
            (g["rt"] - g["wall"] * 0.5, g["H"] + 0.0003),
        ], steps=128)
        link(rim_band, drink)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.00045)
        grain = bpy.context.active_object
        grain.name = "Grain"
        grain.data.materials.append(rim_material(CFG["rim"]))
        grain.location = (0, 0, -1)  # parked under the bar top; only its copies show
        ps = rim_band.modifiers.new("Crystals", "PARTICLE_SYSTEM").particle_system
        st = ps.settings
        st.type = "HAIR"
        st.count = 6500
        st.distribution = "RAND"
        st.render_type = "OBJECT"
        st.instance_object = grain
        st.particle_size = 1.0
        st.size_random = 0.7
        st.use_rotations = True
        st.rotation_mode = "NOR"
        st.phase_factor_random = 2.0
        st.rotation_factor_random = 1.0
        st.hair_length = 1.0  # copies are sized by hair length, so 1.0 = true size
        st.use_advanced_hair = True
        st.use_modifier_stack = True
        rim_band.show_instancer_for_render = False  # draw the crystals, not the band

    if CFG.get("drops"):
        # Condensation drops on the cold outside wall.
        band = revolve("DropBand", [
            (g["outer"](z) + 0.0002, z) for z in [g["floor"] - 0.004 + i * ((z_full - g["floor"]) / 24) for i in range(25)]
        ], steps=128)
        link(band, drink)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.0009)
        drop = bpy.context.active_object
        drop.name = "Drop"
        drop.scale = (1, 1, 0.45)  # flattened against the glass
        bpy.ops.object.shade_smooth()
        drop.data.materials.append(water_drop_material())
        drop.location = (0, 0, -1)  # parked under the bar top; only its copies show
        ps = band.modifiers.new("Drops", "PARTICLE_SYSTEM").particle_system
        st = ps.settings
        st.type = "HAIR"
        st.count = 1900
        st.distribution = "RAND"
        st.render_type = "OBJECT"
        st.instance_object = drop
        st.particle_size = 1.2
        st.size_random = 0.95
        st.use_rotations = True
        st.rotation_mode = "NOR"
        st.hair_length = 1.0  # copies are sized by hair length, so 1.0 = true size
        st.use_advanced_hair = True
        band.show_instancer_for_render = False  # draw the drops, not the band

    # Garnish: a mango wedge that drops onto the rim after the pour.
    if CFG["garnish"] == "mango":
        flesh, skin = mango_materials()
        w = mango_wedge()
        w.data.materials.append(flesh)
        w.data.materials.append(skin)
        link(w, drink)
        # Rest pose: hooked over the right rim, cut face toward the camera.
        ang = math.radians(28)
        rest = Vector((math.cos(ang) * g["rt"] * 1.12, math.sin(ang) * g["rt"] * 1.12, g["H"] + 0.0035))
        rest_rot = (math.radians(4), math.radians(14), math.radians(-14))
        w.rotation_euler = (math.radians(25), math.radians(-40), rest_rot[2] - 0.6)
        w.location = rest + Vector((0, 0, 0.09))
        w.keyframe_insert("location", frame=F_GARNISH[0])
        w.keyframe_insert("rotation_euler", frame=F_GARNISH[0])
        w.location = rest
        w.rotation_euler = rest_rot
        w.keyframe_insert("location", frame=F_GARNISH[1])
        w.keyframe_insert("rotation_euler", frame=F_GARNISH[1])
        for fc in fcurves_of(w):
            for kp in fc.keyframe_points:
                kp.interpolation = "BACK"  # lands with a soft settle
                kp.easing = "EASE_OUT"
        # Hidden until it starts falling.
        w.hide_render = True
        w.keyframe_insert("hide_render", frame=F_GARNISH[0] - 1)
        w.hide_render = False
        w.keyframe_insert("hide_render", frame=F_GARNISH[0])

    if CFG["garnish"] in WHEEL_R:
        kind = CFG["garnish"]
        R = WHEEL_R[kind]
        bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=R, depth=0.005)
        w = bpy.context.active_object
        w.name = "Wheel"
        w.data.materials.append(citrus_wheel_material(kind))
        bev = w.modifiers.new("Rounded", "BEVEL")
        bev.width = 0.0012
        bev.segments = 3
        add_subsurf(w, 1)
        bpy.ops.object.shade_smooth()
        link(w, drink)
        # Perched on the right rim (slit over the glass edge), face toward the camera.
        ang = math.radians(22)
        rr = g["outer"](g["H"] - 0.001)
        rest = Vector((math.cos(ang) * rr, math.sin(ang) * rr, g["H"] + R * 0.42))
        rest_rot = (math.radians(90), math.radians(8), ang)
        w.rotation_euler = (math.radians(60), math.radians(-30), ang - 0.5)
        w.location = rest + Vector((0, 0, 0.09))
        w.keyframe_insert("location", frame=F_GARNISH[0])
        w.keyframe_insert("rotation_euler", frame=F_GARNISH[0])
        w.location = rest
        w.rotation_euler = rest_rot
        w.keyframe_insert("location", frame=F_GARNISH[1])
        w.keyframe_insert("rotation_euler", frame=F_GARNISH[1])
        for fc in fcurves_of(w):
            for kp in fc.keyframe_points:
                kp.interpolation = "BACK"
                kp.easing = "EASE_OUT"
        w.hide_render = True
        w.keyframe_insert("hide_render", frame=F_GARNISH[0] - 1)
        w.hide_render = False
        w.keyframe_insert("hide_render", frame=F_GARNISH[0])

    if CFG.get("fizz"):
        # Soda bubbles rising through the lower part of the drink once it's poured.
        z_mid = g["floor"] + (z_full - g["floor"]) * 0.65
        zone = revolve("BubbleZone", liquid_profile(g, z_mid))
        link(zone, drink)
        zone.show_instancer_for_render = False
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.00065)
        bub = bpy.context.active_object
        bub.name = "Bubble"
        bub.data.materials.append(bubble_material())
        bub.location = (0, 0, -1)  # parked under the bar top
        ps = zone.modifiers.new("Fizz", "PARTICLE_SYSTEM").particle_system
        st = ps.settings
        st.type = "EMITTER"
        st.emit_from = "VOLUME"
        st.distribution = "RAND"
        st.count = 1400
        st.frame_start = F_POUR[1] - 8
        st.frame_end = F_SPIN[1]
        st.lifetime = 34
        st.lifetime_random = 0.5
        st.normal_factor = 0.0
        st.object_align_factor = (0, 0, 0.035)  # rise ~3.5 cm per second
        st.factor_random = 0.004
        st.effector_weights.gravity = 0.0
        st.render_type = "OBJECT"
        st.instance_object = bub
        st.particle_size = 1.0
        st.size_random = 0.7

    # Spin: one smooth full turn.
    drink.rotation_euler = (0, 0, 0)
    drink.keyframe_insert("rotation_euler", frame=F_SPIN[0])
    drink.rotation_euler = (0, 0, math.tau)
    drink.keyframe_insert("rotation_euler", frame=F_SPIN[1])
    for fc in fcurves_of(drink):
        for kp in fc.keyframe_points:
            kp.interpolation = "SINE"
            kp.easing = "EASE_IN_OUT"

    # Light linking (like flags on a real set): the glow-from-behind light only touches the drink,
    # the rim strips only touch the glass and what's in it. The bar top stays dark wood.
    def receivers(name, objs):
        c = bpy.data.collections.new(name)
        for o in objs:
            c.objects.link(o)
        return c
    drink_parts = [o for o in bpy.data.objects if o.type == "MESH" and o.name not in ("BarTop", "LevelCutter")]
    rim_lit = receivers("RimLit", drink_parts)
    back_lit = receivers("BackLit", [o for o in drink_parts if o.name in ("Liquid", "Stream", "Mango", "Wheel", "Bubble") or o.name.startswith("Ice")])
    for name in ("Rim-1", "Rim1"):
        bpy.data.objects[name].light_linking.receiver_collection = rim_lit
    bpy.data.objects["Back"].light_linking.receiver_collection = back_lit

    out_dir = os.path.join(RENDERS, DRINK)
    os.makedirs(out_dir, exist_ok=True)
    bpy.context.scene.render.filepath = os.path.join(out_dir, "f_####")
    blend = os.path.join(ROOT, f"{DRINK}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    print("SAVED", blend)

    if TEST_FRAME:
        sc = bpy.context.scene
        sc.frame_set(int(TEST_FRAME))
        sc.render.filepath = os.path.join(RENDERS, f"test_{DRINK}_{TEST_FRAME}.png")
        bpy.ops.render.render(write_still=True)
        print("TEST RENDER", sc.render.filepath)

build()
