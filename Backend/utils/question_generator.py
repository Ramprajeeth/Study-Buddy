import requests
import json
import uuid
import re
from firebase_config import db
from firebase_admin import firestore
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def generate_questions(text, user_id, file_id):
    prompt = f"""
Generate exactly 10 multiple-choice questions (MCQs) and flashcards from the following text.

Each question must have:
- 4 options
- A correct answer (as an index 1–4)

Each flashcard must be a simplified question–answer pair (front/back) based on the content.

Return the result as a valid JSON array ONLY, with no additional text, markdown, or code blocks (no ```json```), strictly formatted like this:
[
  {{
    "question": "Your question",
    "options": ["option 1", "option 2", "option 3", "option 4"],
    "correct_answer": 1
  }}
]

Text:
{text}
"""

    try:
        logger.info("Sending request to OpenRouter API")
        logger.info(f"Text sent to API: {text[:100] if text else 'Empty'}")
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": "Bearer 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",
                "Content-Type": "application/json"
            },
            data=json.dumps({
                "model": "openai/gpt-3.5-turbo",
                "messages": [{"role": "user", "content": prompt}]
            })
        )

        if response.status_code != 200:
            logger.error(f"API request failed with status {response.status_code}: {response.text}")
            return {"error": f"API request failed with status {response.status_code}"}, 500

        result = response.json()
        generated_text = result['choices'][0]['message']['content'].strip()
        logger.info(f"Raw API response: {generated_text}")

    except Exception as e:
        logger.error(f"Failed to call the question generation API: {str(e)}", exc_info=True)
        return {"error": f"Failed to call the question generation API: {str(e)}"}, 500

    # Try to extract JSON array with more permissive matching
    match = re.search(r'\[.*\]', generated_text, re.DOTALL)
    if match:
        clean_json = match.group(0)
    elif generated_text.startswith('[') and generated_text.endswith(']'):
        clean_json = generated_text
    else:
        # Fallback to strip any leading/trailing non-JSON content
        start = generated_text.find('[')
        end = generated_text.rfind(']') + 1
        clean_json = generated_text[start:end] if start != -1 and end != 0 else None
    logger.info(f"Extracted clean_json: {clean_json}")

    try:
        if clean_json:
            questions_raw = json.loads(clean_json)
        else:
            raise ValueError("No valid JSON array found in response")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {str(e)}. Raw response: {generated_text}. Falling back to 10 dummy questions.")
        questions_raw = [
            {"question": f"Fallback Question {i+1}", "options": [f"A{i+1}", f"B{i+1}", f"C{i+1}", f"D{i+1}"], "correct_answer": (i % 4) + 1}
            for i in range(10)
        ]

    questions = []
    flashcards = []

    for q in questions_raw:
        try:
            question_text = q.get('question', '').strip()
            options = q.get('options', [])
            correct_index = int(q.get('correct_answer', 0)) - 1

            if not question_text or not isinstance(options, list) or len(options) != 4:
                logger.warning(f"Invalid question format: {q}")
                continue
            if correct_index < 0 or correct_index >= len(options):
                logger.warning(f"Invalid correct_answer index: {correct_index} for {q}")
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
            flashcards.append({
                "front": question_text,
                "back": correct_answer
            })

        except Exception as e:
            logger.warning(f"Skipping invalid question due to error: {e}")
            continue

    if not questions:
        logger.error("No valid questions parsed")
        return {"error": "No valid questions could be parsed from the response"}, 500

    # Ensure exactly 10 questions/flashcards
    while len(questions) < 10:
        i = len(questions)
        question_data = {
            "fileId": file_id,
            "userId": user_id,
            "questionText": f"Fallback Question {i+1}",
            "type": "mcq",
            "options": [f"A{i+1}", f"B{i+1}", f"C{i+1}", f"D{i+1}"],
            "correctAnswer": f"A{i+1}",
            "userAnswer": "",
            "isCorrect": False,
            "answeredAt": None
        }
        questions.append(question_data)
        flashcards.append({"front": f"Fallback Question {i+1}", "back": f"A{i+1}"})

    store_flashcards(flashcards, user_id, file_id)
    logger.info(f"Returning {len(questions)} questions and {len(flashcards)} flashcards")
    return {"questions": questions, "flashcards": flashcards}, 200

def store_flashcards(flashcards, user_id, file_id):
    for card in flashcards:
        front = card.get("front", "").strip()
        back = card.get("back", "").strip()
        if front and back:
            db.collection("flashcards").add({
                "front": front,
                "back": back,
                "createdAt": firestore.SERVER_TIMESTAMP,
                "userId": user_id,
                "fileId": file_id
            })