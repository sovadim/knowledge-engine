import os

from langchain_openai import AzureChatOpenAI

from langchain_core.messages import SystemMessage, HumanMessage

from prompts import EVAL_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT, FINISH_CHECK_SYSTEM_PROMPT


class JudgeAI:
    def __init__(self):
        self.ai = QueryAI()

    def eval(self, question: str, answer: str) -> int:
        """Invoke AI to judge the answer and return integer score from 0 to 4"""

        PROMPT = f"""
        Question: {question}
        Answer: {answer}
        """

        score = int(self.__make_model_call(PROMPT, EVAL_SYSTEM_PROMPT))

        return score

    def summarize(self, answers: str) -> str:
        """Invoke AI to conduct interview summary"""

        return self.__make_model_call(answers, SUMMARY_SYSTEM_PROMPT)

    def finish(self, answer: str) -> str:
        """Invoke AI to understand user want to finish interview"""

        return self.__make_model_call(answer, FINISH_CHECK_SYSTEM_PROMPT)

    def __make_model_call(self, prompt: dict | str, system: str) -> str:
        """
        Here is the realization of this class. We have a separate interfaces here and for each interface we can just
        pass the prompt and system
        """
        system_message = SystemMessage(system)

        human_message = HumanMessage(prompt)

        messages = [system_message, human_message]

        response = self.ai.query_ai(messages)

        return response[0]


class QueryAI:
    def __init__(self):
        azure_endpoint = os.getenv("AZURE_ENDPOINT", "https://ai-proxy.lab.epam.com")
        api_key = os.getenv("DIAL_API_KEY", "dial-w58u49yhx85pmdawjnmchax51ew")

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
