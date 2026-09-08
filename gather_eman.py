#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# gather_eman.py — eman.uz'дан ЛДСП katalogini yuklab, eman-catalogue.json qiladi.
#
# ISHGA TUSHIRISH (internetли mashinада, oddiy terminalда):
#     python gather_eman.py
#
# Kerak: Pillow + numpy   (agar yo'q bo'lsa:  pip install pillow numpy)
#
# BIRINCHI MARTA:  LIMIT = 20  (pastда) — 20 ta bilan SINAB ko'ring, ishlаса...
# HAMMASI uchun:   LIMIT = 0   ga o'zgartiring va qayta yuriting (362+ keladi).

import json, re, sys, time, io, ssl, urllib.request
from PIL import Image
import numpy as np

# eman.uz sertifikati muddати o'tган / tizim CA eskirган — ommaviy ma'lumot uchun tekshiruvni
# o'chiramiz (parol/login yo'q, faqat o'qiymiz).
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

BASE = "https://eman.uz"
MEDIA = "https://media.eman.uz"            # mahsulot rasmlari shu hostда (/media/product_images/...)
LIST_URL = BASE + "/ru/product/15/list/"   # ЛДСП kategoriyа (362 mahsulot, sahifalarга bo'lingan)
OUT = "eman-catalogue.json"
LIMIT = 0                                  # 0 = HAMMASI (362+). Sinov uchun 20 edi.
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) catalogue-gatherer"}


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as r:
        data = r.read()
    return data if binary else data.decode("utf-8", "replace")


def product_ids_on_page(html):
    # sahifадаги mahsulot havolalari: /ru/product/1408/  (kategoriyа /15/list/ emas)
    ids = re.findall(r"/ru/product/(\d+)/(?!list)", html)
    return list(dict.fromkeys(ids))   # takrorlarни olib tashlaydi, tartibни saqlaydi


def td_value(html, label):
    # spec: <span>Вес,кг:</span> <i></i> <b>76</b>  →  76
    m = re.search(label + r"[^<]*?</span>\s*(?:<i\b[^>]*>\s*</i>\s*)?<b\b[^>]*>\s*(\d+)", html)
    return int(m.group(1)) if m else None


def avg_hex(img_bytes):
    im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    w, h = im.size
    im = im.crop((int(w * 0.2), int(h * 0.2), int(w * 0.8), int(h * 0.8)))  # markazни ol
    a = np.asarray(im).reshape(-1, 3)
    m = a.mean(axis=0).astype(int)
    return "#%02x%02x%02x" % (int(m[0]), int(m[1]), int(m[2]))


def parse_product(pid):
    html = fetch("%s/ru/product/%s/" % (BASE, pid))
    # nomi — <h1> (og:title sayt nomini «Eman Materials» beradi, shuning uchun h1'дан olamiz)
    m = re.search(r"<h1[^>]*>\s*([^<]+?)\s*</h1>", html)
    name = m.group(1).strip() if m else ""
    # narх — «so'm»/«сум»/«so‘m» oldida turган raqam
    price = None
    pm = re.search(r"([\d\s ]{4,})\s*(?:so'm|so‘m|сум)", html, re.I)
    if pm:
        digits = re.sub(r"\D", "", pm.group(1))
        price = int(digits) if digits else None
    # qalinlik — «18мм»
    tm = re.search(r"(\d{1,2})\s*мм", name) or re.search(r"(\d{1,2})\s*мм", html)
    thickness = int(tm.group(1)) if tm else None
    # list o'lcham + og'irlik — spec-jadvaldan (<td>Длина,мм:</td><td><strong>2800</strong>)
    sheetW = td_value(html, "Длина")      # 2800
    sheetH = td_value(html, "Ширина")     # 2070
    weight = td_value(html, "Вес")        # 76
    if not thickness:
        thickness = td_value(html, "Толщина")
    # zichlik = og'irlik / hajm
    density = None
    if weight and sheetW and sheetH and thickness:
        vol = (sheetW / 1000.0) * (sheetH / 1000.0) * (thickness / 1000.0)
        if vol > 0:
            density = round(weight / vol)
    # rasm — mahsulot fotosи (/media/product_images/...) sahifа hostiда (eman.uz), media. emas
    im = re.search(r"(/media/product_images/[^\"'\s>)]+)", html)
    img_url = (BASE + im.group(1)) if im else None
    color = None
    if img_url:
        try:
            color = avg_hex(fetch(img_url, binary=True))
        except Exception as e:
            print("      (rasm xato %s: %s)" % (pid, e))
    return {
        "id": pid, "name": name, "price": price, "thicknessMm": thickness,
        "sheetW": sheetW, "sheetH": sheetH, "weightKg": weight,
        "densityKgM3": density, "color": color,
        "url": "%s/ru/product/%s/" % (BASE, pid),
    }


def main():
    # 1) sahifаларни aylanib, barcha mahsulot id'larини yig'
    ids, page = [], 1
    while True:
        url = LIST_URL + ("?page=%d" % page if page > 1 else "")
        try:
            html = fetch(url)
        except Exception as e:
            print("sahifа %d xato: %s" % (page, e)); break
        found = product_ids_on_page(html)
        new = [i for i in found if i not in ids]
        if not new:
            break                      # yangi mahsulot yo'q → oxiri
        ids += new
        print("sahifа %d: +%d mahsulot (jami %d)" % (page, len(new), len(ids)))
        if LIMIT and len(ids) >= LIMIT:
            ids = ids[:LIMIT]; break
        page += 1
        time.sleep(0.4)

    # 2) har mahsulotning to'liq ma'lumoti + rangi
    print("\n%d ta mahsulot yuklanyapti...\n" % len(ids))
    out = []
    for n, pid in enumerate(ids, 1):
        try:
            p = parse_product(pid)
            out.append(p)
            print("[%d/%d] %-36s %-9s %sx%s %skg d=%s %s" % (
                n, len(ids), (p["name"] or "")[:36], p["price"],
                p.get("sheetW"), p.get("sheetH"), p.get("weightKg"), p.get("densityKgM3"), p["color"]))
        except Exception as e:
            print("[%d/%d] id %s XATO: %s" % (n, len(ids), pid, e))
        time.sleep(0.3)

    # 3) faylга saqla
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("\nTAYYOR — %d ta material → %s" % (len(out), OUT))


if __name__ == "__main__":
    if "debug" in sys.argv:
        # bitta sahifаning XOM HTMLini faylга saqlaydi (dev shu faylni o'qib regex yozadi)
        html = fetch(BASE + "/ru/product/1408/")
        open("debug_product.html", "w", encoding="utf-8").write(html)
        print("saqlandi: debug_product.html (%d belgi)" % len(html))
        for label in ["Вес", "Длина", "Ширина", "Толщина"]:
            i = html.find(label)
            print("\n--- %s (@%d) ---" % (label, i))
            print(repr(html[i - 12:i + 130]) if i >= 0 else "TOPILMADI")
    else:
        main()
