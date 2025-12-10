from query_ai import QueryAI

llm = QueryAI()

messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello how are you?"}
]

response = llm.query_ai(messages)

print("AI response: ", response)
