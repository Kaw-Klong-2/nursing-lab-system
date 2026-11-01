import sys
from rembg import remove, new_session
from PIL import Image

def process_image(input_path, output_path):
    print(f"Loading {input_path}...")
    input_image = Image.open(input_path)
    # Resize max dimension to 800 for fast, memory-safe inference
    input_image.thumbnail((800, 800), Image.Resampling.LANCZOS)
    print(f"Resized image for processing: {input_image.size}")
    
    # Use lightweight u2netp session
    print("Initializing u2netp session...")
    session = new_session("u2netp")
    print("Removing background...")
    output_image = remove(input_image, session=session)
    output_image.save(output_path, "PNG")
    print(f"Saved cut-out image to {output_path}")

if __name__ == "__main__":
    inp = "public/existing-sample.jpg"
    out = "public/existing-sample-cutout.png"
    process_image(inp, out)
