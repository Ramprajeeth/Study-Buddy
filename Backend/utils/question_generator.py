import requests
import json
import uuid
import re
from firebase_config import db
from firebase_admin import firestore

def generate_questions(text, user_id, file_id):
    prompt = f"""
Generate 10 multiple-choice questions (MCQs) AND flashcards from the following text.

Each question should have:
- 4 options
- A correct answer (as an index 1–4)

Each flashcard should be a simplified question – answer pair (front/back) based on the content.

Respond ONLY in direct JSON format, like this:
[ {{ "question": "Your question", "options": ["option 1", "option 2", "option 3", "option 4"], "correct_answer": <option number starting from 1> }} ]

rust
Copy
Edit

Text:
{text}
"""

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": "Bearer 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",
                "Content-Type": "application/json"
            },
            data=json.dumps({
                "model": "deepseek/deepseek-chat-v3-0324:free",
                "messages": [{"role": "user", "content": prompt}]
            })
        )

        if response.status_code != 200:
            return [], f"API request failed with status code {response.status_code}"

        result = response.json()
        generated_text = result['choices'][0]['message']['content'].strip()

    except Exception as e:
        return {"error": "Failed to call the question generation API"}, 500

    match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", generated_text, re.DOTALL)
    clean_json = match.group(1) if match else generated_text

    try:
        questions_raw = json.loads(clean_json)
    except Exception as e:
        return {"error": "Failed to parse questions"}, 500

    questions = []
    flashcards = []

    for q in questions_raw:
        try:
            question_text = q['question'].strip()
            options = q['options']
            correct_index = int(q['correct_answer']) - 1
            if correct_index < 0 or correct_index >= len(options):
                continue

            correct_answer = options[correct_index]

            question_data = {
                "fileId": file_id,
                "userId": user_id,
                "questionText": question_text,
                "type": "mcq",
                "options": options,
                "correctAnswer": correct_answer,
                "userAnswer": "",
                "isCorrect": False,
                "answeredAt": None
            }

            question_id = str(uuid.uuid4())
            db.collection("questions").document(question_id).set(question_data)
            questions.append(question_data)
            flashcards.append({"front": question_text, "back": correct_answer})

        except Exception as e:
            continue

    if not questions:
        return {"error": "No valid questions could be parsed from the response"}, 500

    store_flashcards(flashcards, user_id, file_id)
    return {"questions": questions, "flashcards": flashcards}, 200

def store_flashcards(flashcards, user_id, file_id):
    for card in flashcards:
        db.collection("flashcards").add({
            "front": card["front"],
            "back": card["back"],
            "createdAt": firestore.SERVER_TIMESTAMP,
            "userId": user_id,
            "fileId": file_id
        })