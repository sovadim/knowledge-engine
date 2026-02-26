from openai import AzureOpenAI
import os

from langchain_openai import AzureChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from prompts import EVAL_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT


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
            return 1  # Dummy evaluation

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
    def __init__(self):
        azure_endpoint = os.getenv("AZURE_ENDPOINT", "https://ai-proxy.lab.epam.com")
        api_key = os.getenv("DIAL_API_KEY", "dial-w58u49yhx85pmdawjnmchax51ew")

        if not azure_endpoint:
            print("Please export AZURE_ENDPOINT environment variable.")

        self.client = AzureChatOpenAI(
            api_key=api_key,
            azure_endpoint=azure_endpoint,
            azure_deployment="gpt-4o-mini-2024-07-18",
            openai_api_version="2024-02-01",
            max_tokens=8192,
            temperature=0
        )

    def set_api_key(self, api_key: str):
        self.client.api_key = api_key

    def query_ai(self, messages):
        try:
            response = self.client.invoke(messages)
            return response.content, getattr(response, "id", None)

        except Exception as e:
            error_type = type(e).__name__
            error_message = f"Service OpenAI returned error: {str(e)}"
            raise RuntimeError(f"{error_message} (Error Type: {error_type})")
