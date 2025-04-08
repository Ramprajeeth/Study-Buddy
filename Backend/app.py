from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from utils.pdf_parser import extract_text_from_pdf
from utils.question_generator import generate_questions
import firebase_admin
from firebase_admin import credentials, firestore
import logging

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Setup Flask app
app = Flask(__name__, static_folder='out', static_url_path='/')
CORS(app)

app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024
UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Serve frontend
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/generate-questions', methods=['POST'])
def generate_questions_endpoint():
    try:
        logger.info("Received /generate-questions request")
        
        if 'file' not in request.files:
            logger.error("No file part in request")
            return jsonify({"error": "No file part"}), 400

        file = request.files['file']
        if file.filename == '':
            logger.error("No selected file")
            return jsonify({"error": "No selected file"}), 400

        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(file_path)
        logger.info(f"Saved file to {file_path}")

        text = extract_text_from_pdf(file_path)
        if not text.strip():
            logger.error("No text found in the PDF")
            return jsonify({"error": "No text found in the PDF"}), 400

        logger.info(f"Extracted text (first 100 chars): {text[:100]}")

        user_id = request.form.get("userId", "dummy_user_id")
        file_id = request.form.get("fileId", "dummy_file_id")

        result, status_code = generate_questions(text, user_id, file_id)
        if status_code != 200:
            logger.error(f"generate_questions failed with status {status_code}: {result}")
            return jsonify(result), status_code

        logger.info("Generated questions and flashcards successfully")
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Unexpected error in generate_questions_endpoint: {str(e)}", exc_info=True)
        # Fallback response for testing
        fallback_result = {
            "questions": [{"correctAnswer": "Fallback Q", "options": ["A", "B", "C", "D"]}],
            "flashcards": [{"front": "Fallback Front", "back": "Fallback Back"}]
        }
        return jsonify(fallback_result), 200  # Return 200 to test frontend

@app.route('/flashcards', methods=['POST'])
def create_flashcard():
    data = request.json
    front = data.get("front")
    back = data.get("back")
    user_id = data.get("userId", "dummy_user_id")
    file_id = data.get("fileId", "dummy_file_id")

    if not front or not back:
        return jsonify({"error": "Front and Back are required"}), 400

    db.collection("flashcards").add({
        "front": front,
        "back": back,
        "userId": user_id,
        "fileId": file_id,
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    return jsonify({"message": "Flashcard created successfully"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)