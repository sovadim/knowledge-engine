import os

from langchain_openai import AzureChatOpenAI

from prompts import EVAL_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT


class JudgeAI:
    def __init__(self):
        self.ai = QueryAI()

    def eval(self, question: str, answer: str) -> int:
        """Invoke AI to judge the answer and return integer score from 0 to 4"""

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

        messages = [
            {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": answers}
        ]

        response = self.ai.query_ai(messages)
        return response[0]


class QueryAI:
    def __init__(self):
        azure_endpoint = os.getenv("AZURE_ENDPOINT")
        api_key = os.getenv("DIAL_API_KEY")

        self.client = AzureChatOpenAI(
            api_key=api_key,
            azure_endpoint=azure_endpoint,
            azure_deployment="gpt-4o-mini-2024-07-18",
            openai_api_version="2024-02-01",
            max_tokens=8192,
            temperature=0
        )

    def query_ai(self, messages):
        try:
            response = self.client.invoke(messages)
            return response.content, getattr(response, "id", None)

        except Exception as e:
            error_type = type(e).__name__
            error_message = f"Service OpenAI returned error: {str(e)}"
            raise RuntimeError(f"{error_message} (Error Type: {error_type})")
