# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Environment hints to avoid building from source
ENV PIP_NO_CACHE_DIR=1 \
	PIP_PREFER_BINARY=1 \
	HF_HOME=/tmp/hf \
	TRANSFORMERS_CACHE=/tmp/hf

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application into the container at /app
COPY . .

# Command to run the application
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]