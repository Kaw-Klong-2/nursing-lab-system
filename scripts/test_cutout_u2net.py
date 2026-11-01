import sys
from rembg import remove, new_session
from PIL import Image

def process_image(input_path, output_path, model_name="u2net"):
    print(f"Loading {input_path}...")
    input_image = Image.open(input_path)
    input_image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
    print(f"Resized image for processing: {input_image.size}")
    
    print(f"Initializing {model_name} session...")
    session = new_session(model_name)
    print("Removing background...")
    output_image = remove(input_image, session=session)
    output_image.save(output_path, "PNG")
    print(f"Saved cut-out image to {output_path}")

if __name__ == "__main__":
    process_image("public/sample-bre.jpg", "public/sample-bre-cutout.png", "u2net")
