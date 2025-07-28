import requests
import json
import uuid
import re
from firebase_config import db
from firebase_admin import firestore
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def generate_questions(text, user_id, file_id, question_type="Multiple Choice", difficulty="Medium", num_questions="10"):
    num_questions = int(num_questions)
    
    prompt = f"""
Generate exactly {num_questions} questions and {num_questions} flashcards from the following text based on the specified preferences. Do not generate fallback questions; all questions must be directly related to the provided text.

Question Type: {question_type}
Difficulty: {difficulty}
Each question must be of type "{question_type}" only:
- For Multiple Choice: 4 options and a correct answer (as a string)
- For Fill in the Blank: A question with a blank (____) and a correct answer (as a string)
- For True/False: A statement with a correct answer ("True" or "False")

Each flashcard must be:
- For Multiple Choice: Simplified question–answer pair (front: question, back: answer)
- For Fill in the Blank: Front with the blank (____), back with the answer
- For True/False: Front as the statement, back as "True" or "False"

Return the result as a valid JSON array ONLY, with no additional text, markdown, or code blocks (no ```json```), strictly formatted like this:
[
  {{
    "type": "{question_type}",
    "question": "Your question",
    "options": ["option 1", "option 2", "option 3", "option 4"],
    "correct_answer": "option 1"
  }}
]
or
[
  {{
    "type": "{question_type}",
    "question": "Your question with ____",
    "correct_answer": "answer"
  }}
]
or
[
  {{
    "type": "{question_type}",
    "question": "Your statement",
    "correct_answer": "True"
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

    match = re.search(r'\[.*\]', generated_text, re.DOTALL)
    if match:
        clean_json = match.group(0)
    elif generated_text.startswith('[') and generated_text.endswith(']'):
        clean_json = generated_text
    else:
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
        logger.error(f"Failed to parse JSON: {str(e)}. Raw response: {generated_text}")
        return {"error": "Failed to parse API response into valid questions"}, 500

    questions = []
    flashcards = []

    for q in questions_raw:
        try:
            q_type = q.get('type', question_type)
            if q_type != question_type:
                logger.warning(f"Question type mismatch: {q_type} != {question_type}")
                continue
            question_text = q.get('question', '').strip()
            correct_answer = q.get('correct_answer', '')

            if not question_text or not correct_answer:
                logger.warning(f"Invalid question format: {q}")
                continue

            question_data = {
                "fileId": file_id,
                "userId": user_id,
                "questionText": question_text,
                "type": q_type,
                "correctAnswer": correct_answer,
                "userAnswer": "",
                "isCorrect": False,
                "answeredAt": None
            }

            flashcard_data = {
                "front": question_text,
                "back": correct_answer
            }

            if q_type == "Multiple Choice":
                options = q.get('options', [])
                if not isinstance(options, list) or len(options) != 4 or correct_answer not in options:
                    logger.warning(f"Invalid MCQ format: {q}")
                    continue
                question_data["options"] = options
            elif q_type == "Fill in the Blank":
                if "____" not in question_text:
                    logger.warning(f"Invalid Fill in the Blank format: {q}")
                    continue
            elif q_type == "True/False":
                if correct_answer not in ["True", "False"]:
                    logger.warning(f"Invalid True/False format: {q}")
                    continue
                question_data["options"] = ["True", "False"]
            else:
                logger.warning(f"Unsupported question type: {q_type}")
                continue

            question_id = str(uuid.uuid4())
            db.collection("questions").document(question_id).set(question_data)
            questions.append(question_data)
            flashcards.append(flashcard_data)

        except Exception as e:
            logger.warning(f"Skipping invalid question due to error: {e}")
            continue

    if not questions or len(questions) < num_questions:
        logger.error(f"Not enough valid questions generated: {len(questions)}/{num_questions}")
        return {"error": f"Failed to generate sufficient questions from the text. Generated {len(questions)} instead of {num_questions}"}, 500

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
                "userId": user_id,
                "fileId": file_id,
                "createdAt": firestore.SERVER_TIMESTAMP
            })