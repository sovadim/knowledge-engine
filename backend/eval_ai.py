from openai import AzureOpenAI
import os


EVAL_SYSTEM_PROMPT = """
You are an expert judge for evaluating answers to questions.
You will evaluate the answers to interview questions in Java domain.

Score the candidate's answer from 0 to 4.
4 = Completely correct, precise, and clear.
3 = Mostly correct, minor omission.
2 = Partially correct, but missing important details.
1 = Mostly incorrect, small parts may be true.
0 = Completely incorrect or irrelevant.

Your answer should be only an integer score from 0 to 4.

Here is the question, and the answer to it from the user:
"""

SUMMARY_SYSTEM_PROMPT = """
You are an interview feedback engine. The interview overall covers the knowledge of Java. It goes through the sub-topics and specific skills.

Your task is to generate a concise, professional interview summary based strictly on the provided data.
Do not reference the interview questions verbatim unless needed for clarity.
You are addressing the user directly.

Focus on:
- overall assessment,
- knowledge gaps,
- actionable recommendations.

If there are no knowledge gaps detected, don't talk about it. And don't recommend to learn something new. Give only recommendations that will help cover the knowledge gaps.

The sub-topics can be too atomic. You should now focus on a high-level perspective, which makes sense.

You will be given a list of: sub-topics, specific topics, questions given to the user on that topic, and a score of the user's answer from 0 to 4, calculated by the followuing rules:
4 = Completely correct, precise, and clear.
3 = Mostly correct, minor omission.
2 = Partially correct, but missing important details.
1 = Mostly incorrect, small parts may be true.
0 = Completely incorrect or irrelevant.

Here are the user's results:

"""

class JudgeAI:
    def __init__(self, api_key: str = None):
        self.ai = QueryAI()
        api_key = os.getenv("DIAL_API_KEY")
        if api_key:
            self.set_api_key(api_key)
            self.api_key_is_set = True
        else:
            self.api_key_is_set = False

    def set_api_key(self, key: str):
        if not key or len(key) == 0:
            self.ai.set_api_key(None)
            self.api_key_is_set = False
        else:
            self.ai.set_api_key(key)
            self.api_key_is_set = True

    def eval(self, question: str, answer: str) -> int:
        """Invoke AI to judge the answer and return integer score from 0 to 4"""

        if not self.api_key_is_set:
            return 1 # Dummy evaluation

        PROMPT = f"""
        Question: {question}
        Answer: {answer}
        """

        messages = [
            {"role": "system", "content": EVAL_SYSTEM_PROMPT},
            {"role": "user", "content": PROMPT}
        ]

        response = self.ai.query_ai(messages)
        score = int(response[0])
        return score
    
    def summarize(self, answers: str) -> str:
        """Invoke AI to conduct interview summary"""

        if not self.api_key_is_set:
            return "API key is not set, can't provide summary"

        messages = [
            {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": answers}
        ]

        response = self.ai.query_ai(messages)
        return response[0]


class QueryAI:
    def __init__(self, temperature=0):
        azure_endpoint = os.getenv("AZURE_ENDPOINT")
        api_key = os.getenv("DIAL_API_KEY")

        if not azure_endpoint:
            print("Please export AZURE_ENDPOINT environment variable.")

        if not api_key:
            api_key=""

        self.temperature = temperature
        self.client = AzureOpenAI(
            api_key=api_key,
            api_version="2025-01-01-preview",
            azure_endpoint=azure_endpoint
        )

    def set_api_key(self, api_key: str):
        self.client.api_key = api_key

    def query_ai(self, messages, llm_model="gpt-4o-mini-2024-07-18"):
        try:
            response = self.client.chat.completions.create(
                model=llm_model,
                messages=messages,
                temperature=self.temperature,
            )
            return response.choices[0].message.content, response.id

        except Exception as e:
            error_type = type(e).__name__
            error_message = f"Service OpenAI returned error: {str(e)}"
            raise RuntimeError(f"{error_message} (Error Type: {error_type})")
