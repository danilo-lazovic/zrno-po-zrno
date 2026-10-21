"""Modeli za 3D „Kralj pare” (Blender 4.2, bez prozora):

    python -m pip install bpy==4.2.0      # Python 3.11
    python frontend/modeli/kralj_pare.py  # piše frontend/public/modeli/kralj-pare.glb (uz --pregled i render modeli/kralj-pare-pregled.png)

Jedinice su metri. Latijera od 350 ml, stimer, rešetka posude i ugao aparata. Unutrašnji profil latijere
(poluprečnik po visini) ide u glTF extras, da 3D igra zna gde je površina mleka.
"""

import json
import math
import sys
from pathlib import Path

import bpy  # bpy mora pre bmesh i mathutils
import bmesh
from mathutils import Vector

KOREN = Path(__file__).resolve().parents[1]
IZLAZ = KOREN / "public" / "modeli" / "kralj-pare.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
scena = bpy.context.scene


def materijal(ime, boja, metal=0.0, hrapavost=0.5):
    m = bpy.data.materials.new(ime)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*boja, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = hrapavost
    return m


def srgb(h):
    """#rrggbb u linearne boje za Blender."""
    c = [int(h[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


INOKS = materijal("inoks", srgb("#c9cdd1"), metal=1.0, hrapavost=0.22)
INOKS_MAT = materijal("inoks-mat", srgb("#9ea4aa"), metal=1.0, hrapavost=0.45)
GUMA = materijal("guma", srgb("#171717"), hrapavost=0.8)
KUCISTE = materijal("kuciste", srgb("#f5d8e7"), hrapavost=0.55)  # roze iz Kafeterija design systema
ZELENA = materijal("zelena", srgb("#1b7a4c"), hrapavost=0.5)


def objekat(ime, mesh, mat):
    o = bpy.data.objects.new(ime, mesh)
    scena.collection.objects.link(o)
    o.data.materials.append(mat)
    return o


def glatko(o, ugao=40):
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.set_sharp_from_angle(angle=math.radians(ugao))


# ---------- latijera: obrtno telo po spoljnom profilu, debljina zida 1,2 mm ----------
VISINA = 0.105
# (poluprečnik, visina) od dna ka obodu: blago trbušasta, uža pri vrhu
PROFIL = [(0.0, 0.0), (0.036, 0.0), (0.0395, 0.004), (0.0405, 0.02), (0.0402, 0.045), (0.038, 0.07), (0.0355, 0.09), (0.0345, VISINA)]
ZID = 0.0012
SEGMENATA = 72


def latijera():
    bm = bmesh.new()
    prstenovi = []
    for r, z in PROFIL[1:]:
        prsten = []
        for i in range(SEGMENATA):
            a = 2 * math.pi * i / SEGMENATA
            x, y = r * math.cos(a), r * math.sin(a)
            # kljun: obod se izvlači napred (+x) i diže, samo u uskom luku oko a = 0
            if z > VISINA * 0.72:
                t = (z - VISINA * 0.72) / (VISINA * 0.28)
                luk = max(0.0, math.cos(a)) ** 10
                x += 0.016 * luk * t**2
                z_v = z + 0.006 * luk * t**2
            else:
                z_v = z
            prsten.append(bm.verts.new((x, y, z_v)))
        prstenovi.append(prsten)
    dno = bm.verts.new((0, 0, 0))
    for i in range(SEGMENATA):
        j = (i + 1) % SEGMENATA
        bm.faces.new((dno, prstenovi[0][j], prstenovi[0][i]))
        for k in range(len(prstenovi) - 1):
            a, b = prstenovi[k], prstenovi[k + 1]
            bm.faces.new((a[i], a[j], b[j], b[i]))
    me = bpy.data.meshes.new("Latijera")
    bm.to_mesh(me)
    bm.free()
    o = objekat("Latijera", me, INOKS)
    sol = o.modifiers.new("zid", "SOLIDIFY")
    sol.thickness = ZID
    sol.offset = -1
    glatko(o)
    return o


def rucka():
    """Ručka: savijena traka sa zadnje strane (-x)."""
    kriva = bpy.data.curves.new("rucka", "CURVE")
    kriva.dimensions = "3D"
    sp = kriva.splines.new("BEZIER")
    tacke = [(-0.035, 0, 0.088), (-0.062, 0, 0.078), (-0.064, 0, 0.035), (-0.039, 0, 0.022)]
    sp.bezier_points.add(len(tacke) - 1)
    for bp, t in zip(sp.bezier_points, tacke):
        bp.co = t
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    kriva.bevel_depth = 0.0035
    kriva.bevel_resolution = 3
    kriva.resolution_u = 16
    o = bpy.data.objects.new("Rucka", kriva)
    scena.collection.objects.link(o)
    o.data.materials.append(INOKS)
    o.scale = (1, 2.2, 1)  # spljoštena traka
    return o


def stimer():
    """Cev stimera: ulazi odozgo i sa strane, vrh na (0,0,0) lokalno; igra ga pomera po visini."""
    kriva = bpy.data.curves.new("stimer", "CURVE")
    kriva.dimensions = "3D"
    sp = kriva.splines.new("BEZIER")
    tacke = [(0.13, 0.0, 0.26), (0.09, 0.0, 0.2), (0.02, 0.0, 0.06), (0.0, 0.0, 0.0)]
    sp.bezier_points.add(len(tacke) - 1)
    for bp, t in zip(sp.bezier_points, tacke):
        bp.co = t
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    kriva.bevel_depth = 0.0042
    kriva.bevel_resolution = 4
    o = bpy.data.objects.new("Stimer", kriva)
    scena.collection.objects.link(o)
    o.data.materials.append(INOKS)
    # vrh mlaznice i gumena izolacija pri vrhu
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0055, depth=0.012, location=(0.0, 0, 0.004), vertices=24)
    vrh = bpy.context.object
    vrh.name = "StimerVrh"
    vrh.data.materials.append(INOKS_MAT)
    vrh.parent = o
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0062, depth=0.05, location=(0.105, 0, 0.228), vertices=24)
    g = bpy.context.object
    g.name = "StimerGuma"
    g.rotation_euler = (0, math.radians(-33), 0)
    g.data.materials.append(GUMA)
    g.parent = o
    return o


def posuda():
    """Rešetka posude za kapljanje ispod latijere."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.02, 0, -0.012))
    o = bpy.context.object
    o.name = "Posuda"
    o.scale = (0.24, 0.16, 0.018)
    bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new("ivica", "BEVEL")
    b.width = 0.004
    b.segments = 3
    o.data.materials.append(INOKS_MAT)
    # proreze rešetke
    for i in range(9):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.07 + i * 0.022, 0, -0.0025))
        p = bpy.context.object
        p.name = f"Prorez{i}"
        p.scale = (0.008, 0.13, 0.002)
        p.data.materials.append(GUMA)
        p.parent = o
    return o


def masina():
    """Ugao aparata iza: kućište u roze boji sa zelenom trakom, samo da scena ima kontekst."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.06, 0.14, 0.15))
    o = bpy.context.object
    o.name = "Masina"
    o.scale = (0.36, 0.08, 0.34)
    bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new("ivica", "BEVEL")
    b.width = 0.012
    b.segments = 4
    o.data.materials.append(KUCISTE)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.06, 0.099, 0.27))
    t = bpy.context.object
    t.name = "MasinaTraka"
    t.scale = (0.36, 0.004, 0.02)
    t.data.materials.append(ZELENA)
    t.parent = o
    return o


lat = latijera()
ruc = rucka()
ruc.parent = lat
stim = stimer()
stim.location = (0.0, 0.0, 0.07)
posuda()
masina()

# unutrašnji profil: poluprečnik po visini (za površinu mleka u igri)
lat["profil"] = json.dumps([[round(r - ZID, 5), z] for r, z in PROFIL[1:]])
lat["visina"] = VISINA

IZLAZ.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(IZLAZ),
    export_format="GLB",
    export_extras=True,
    export_apply=True,
    export_yup=True,
)
print("glb:", IZLAZ, IZLAZ.stat().st_size // 1024, "KB")

if "--pregled" in sys.argv:
    # brz render za proveru oblika (Cycles na procesoru)
    svet = bpy.data.worlds.new("svet")
    svet.use_nodes = True
    svet.node_tree.nodes["Background"].inputs["Color"].default_value = (*srgb("#f2f0e1"), 1)
    svet.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
    scena.world = svet
    bpy.ops.object.light_add(type="AREA", location=(0.3, -0.4, 0.5))
    svetlo = bpy.context.object
    svetlo.data.energy = 60
    svetlo.data.size = 0.6
    svetlo.rotation_euler = (math.radians(50), 0, math.radians(35))
    bpy.ops.object.camera_add(location=(0.32, -0.42, 0.26))
    kam = bpy.context.object
    kam.data.lens = 50
    cilj = Vector((0.0, 0.0, 0.06))
    kam.rotation_euler = (cilj - kam.location).to_track_quat("-Z", "Y").to_euler()
    scena.camera = kam
    scena.render.engine = "CYCLES"
    scena.cycles.samples = 48
    scena.cycles.device = "CPU"
    scena.render.resolution_x, scena.render.resolution_y = 720, 720
    scena.render.filepath = str(Path(__file__).with_name("kralj-pare-pregled.png"))
    bpy.ops.render.render(write_still=True)
    print("pregled:", scena.render.filepath)
