from flask import Flask, request, jsonify, send_from_directory
import os
from utils.pdf_parser import extract_text_from_pdf
from utils.question_generator import generate_questions
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Setup Flask app to serve frontend from ./out
app = Flask(__name__, static_folder='out', static_url_path='/')
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024
UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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

# Backend API routes
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(file_path)

    text = extract_text_from_pdf(file_path)
    if not text.strip():
        return jsonify({"error": "No text found in the PDF"}), 400

    user_id = request.form.get("userId", "dummy_user_id")
    file_id = request.form.get("fileId", "dummy_file_id")

    result, status_code = generate_questions(text, user_id, file_id)
    return jsonify(result), status_code

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
    app.run(debug=True)
