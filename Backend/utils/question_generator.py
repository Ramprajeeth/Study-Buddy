import requests
import json
import uuid
from firebase_config import db
import re

def generate_questions(text, user_id, file_id):
    # Construct prompt for the LLM
    prompt = f"""
Generate 10 multiple-choice questions (MCQs) from the following text.
Each question should have 4 options and a correct answer.

Respond ONLY in direct JSON format do not give any unnecessary text:
```
[
  {{
    "question": "Your question",
    "options": ["option 1", "option 2", "option 3", "option 4"],
    "correct_answer": <option number starting from 1>
  }},
  ```
]

Text:
{text}
"""

    # API request to OpenRouter
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
            print(f"Error {response.status_code}: {response.text}")
            return [], f"API request failed with status code {response.status_code}"

        
        result = response.json()
        generated_text = result['choices'][0]['message']['content'].strip()
        print("Raw response from model:\n", generated_text)
        
    except Exception as e:
        print("Exception during API call:", e)
        return {"error": "Failed to call the question generation API"}, 500

    # Strip markdown if present
    match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", generated_text, re.DOTALL)

    if match:
        clean_json = match.group(1)

    else:
        clean_json = generated_text

    try:
        questions_raw = json.loads(clean_json)
    except Exception as e:
        print("JSON parsing error:", e)
        print("Final text passed to json.loads:\n", clean_json)
        return {"error": "Failed to parse questions"}, 500

    questions = []

    for q in questions_raw:
        try:
            question_text = q['question'].strip()
            options = q['options']
            correct_index = int(q['correct_answer']) - 1  # Convert to 0-based index

            if correct_index < 0 or correct_index >= len(options):
                continue

            question_data = {
                "fileId": file_id,
                "userId": user_id,
                "questionText": question_text,
                "type": "mcq",
                "options": options,
                "correctAnswer": options[correct_index],
                "userAnswer": "",
                "isCorrect": False,
                "answeredAt": None
            }

            question_id = str(uuid.uuid4())
            db.collection("questions").document(question_id).set(question_data)
            questions.append(question_data)

            print(f"Uploaded question: {question_text}")

        except Exception as e:
            print("Skipping invalid question format:", e)

    if not questions:
        return {"error": "No valid questions could be parsed from the response"}, 500

    return {"questions": questions}, 200
