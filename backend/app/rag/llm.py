from functools import lru_cache
from typing import Iterator, Protocol

from app.core.config import settings
from app.core.logger import logger


print("LLM MODULE LOADED")


class LLMUnavailable(Exception):
    """Raised when Groq AI service is unavailable."""
    pass



class LLMClient(Protocol):

    def complete(
        self,
        system: str,
        messages: list[dict],
        max_tokens: int
    ) -> str:
        ...


    def stream(
        self,
        system: str,
        messages: list[dict],
        max_tokens: int
    ) -> Iterator[str]:
        ...



class GroqClient:


    def __init__(
        self,
        api_key: str,
        model: str,
        timeout: float
    ):

        from groq import Groq

        self.client = Groq(
            api_key=api_key
        )

        self.model = model



    def complete(
        self,
        system: str,
        messages: list[dict],
        max_tokens: int
    ) -> str:


        try:

            response = self.client.chat.completions.create(

                model=self.model,

                messages=[
                    {
                        "role": "system",
                        "content": system
                    },
                    *messages
                ],

                max_tokens=max_tokens
            )


            text = response.choices[0].message.content


            if not text:

                raise LLMUnavailable(
                    "Empty response from Groq"
                )


            return text



        except Exception as exc:

            logger.error(
                f"Groq completion failed: {exc}"
            )

            raise LLMUnavailable(
                str(exc)
            )




    def stream(
        self,
        system: str,
        messages: list[dict],
        max_tokens: int
    ) -> Iterator[str]:


        try:

            response = self.client.chat.completions.create(

                model=self.model,

                messages=[
                    {
                        "role": "system",
                        "content": system
                    },
                    *messages
                ],

                max_tokens=max_tokens,

                stream=True
            )


            generated = False


            for chunk in response:


                if not chunk.choices:
                    continue


                text = chunk.choices[0].delta.content


                if text:

                    generated = True
                    yield text



            if not generated:

                raise LLMUnavailable(
                    "Empty streaming response"
                )



        except Exception as exc:

            logger.error(
                f"Groq streaming failed: {exc}"
            )

            raise LLMUnavailable(
                str(exc)
            )





@lru_cache(maxsize=1)
def get_llm_client() -> LLMClient | None:


    print("GET LLM CLIENT CALLED")


    print(
        "GROQ KEY PRESENT:",
        bool(settings.GROQ_API_KEY)
    )


    if not settings.GROQ_API_KEY:

        print(
            "GROQ KEY NOT FOUND"
        )

        return None



    print(
        "USING GROQ MODEL:",
        settings.LLM_MODEL
    )



    return GroqClient(

        api_key=settings.GROQ_API_KEY,

        model=settings.LLM_MODEL,

        timeout=settings.LLM_TIMEOUT_SECONDS

    )