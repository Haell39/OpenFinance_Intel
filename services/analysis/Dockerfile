FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt && \
    python -m spacy download en_core_web_sm && \
    python -m spacy download pt_core_news_sm

COPY app /app/app

ENV PYTHONUNBUFFERED=1

CMD ["python", "app/main.py"]
