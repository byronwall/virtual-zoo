FROM python:3.9-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /service

RUN apt-get update \
  && apt-get install -y --no-install-recommends libgomp1 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./

EXPOSE 7000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7000"]
