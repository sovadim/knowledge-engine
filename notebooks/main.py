from openai import AzureOpenAI
import os

class QueryAI:
    def __init__(self, temperature=0):
        azure_endpoint = os.getenv("AZURE_ENDPOINT")
        api_key = os.getenv("DIAL_API_KEY")

        if not azure_endpoint or not api_key:
            if not azure_endpoint:
                print("Please export AZURE_ENDPOINT environment variable.")
            if not api_key:
                print("Please export DIAL_API_KEY environment variable.")
            return

        self.temperature = temperature
        self.client = AzureOpenAI(
            api_key=api_key,
            api_version="2025-01-01-preview",
            azure_endpoint=azure_endpoint
        )

    def query_ai(self, messages, llm_model="gpt-4o-mini-2024-07-18"):
        print(1)
        try:
            response = self.client.chat.completions.create(
                model=llm_model,
                messages=messages,
                temperature=self.temperature, # Include temperature
            )
            print(response)
            return response.choices[0].message.content, response.id

        except Exception as e:
            error_type = type(e).__name__
            error_message = f"Service OpenAI returned error: {str(e)}"
            raise RuntimeError(f"{error_message} (Error Type: {error_type})")


# Define messages
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "hello how are you?"}
]

# Initialize QueryAI
llm = QueryAI()

# Query AI
response = llm.query_ai(messages)
print("response: ", response)
