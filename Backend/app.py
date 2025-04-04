from flask import Flask, request, jsonify
import os
from utils.pdf_parser import extract_text_from_pdf
from utils.question_generator import generate_questions

app = Flask(__name__)
UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def home():
    return jsonify({
        "message": "Welcome to the Question Generation API. Use /upload to generate questions from a PDF."
    }), 200

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(file_path)

    # Extract text from PDF
    text = extract_text_from_pdf(file_path)
    if not text.strip():
        return jsonify({"error": "No text found in the PDF"}), 400

    # Use dummy IDs or parse from form/request body
    user_id = request.form.get("userId", "dummy_user_id")
    file_id = request.form.get("fileId", "dummy_file_id")

    # Generate questions
    result, status_code = generate_questions(text, user_id, file_id)

    return jsonify(result), status_code

if __name__ == '__main__':
    app.run(debug=True)
