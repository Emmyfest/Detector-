import os
import logging
import requests
from flask import Flask, render_template, request, jsonify, send_from_directory

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create the app
app = Flask(__name__, static_url_path='')
app.secret_key = "default_secret_key"

# Kindwise API endpoint and key
KINDWISE_API_URL = "https://crop.kindwise.com/api/v1"
KINDWISE_API_KEY = "6qTADYbzDR7hVfvOTvmX9vQ6qEudZNMGoQ9rXQEDv70Ox0vieK"

@app.route('/')
def index():
    """Render the main page"""
    return send_from_directory('', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve static files"""
    return send_from_directory('', path)

@app.route('/detect', methods=['POST'])
def detect_disease():
    """Handle crop disease detection API request"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    image_file = request.files['image']
    
    if image_file.filename == '':
        return jsonify({'error': 'No image selected'}), 400
    
    # Check file extension
    allowed_extensions = {'jpg', 'jpeg', 'png', 'bmp'}
    if '.' not in image_file.filename or image_file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
        return jsonify({'error': 'Invalid file format. Supported formats: JPG, JPEG, PNG, BMP'}), 400
    
    try:
        # Prepare the API request
        headers = {
            'X-Api-Key': KINDWISE_API_KEY
        }
        
        files = {
            'image': (image_file.filename, image_file.read(), image_file.content_type)
        }
        
        logger.debug(f"Sending request to Kindwise API with image: {image_file.filename}")
        
        # Make the API request
        response = requests.post(KINDWISE_API_URL, headers=headers, files=files)
        
        # Check the response
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            logger.error(f"API request failed: {response.status_code} - {response.text}")
            return jsonify({
                'error': f"API request failed with status code {response.status_code}",
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        logger.exception("Error in disease detection:")
        return jsonify({'error': f'Error processing request: {str(e)}'}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)