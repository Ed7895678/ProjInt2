import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import string
import os
import logging
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import unicodedata  # Added import
from rapidfuzz import fuzz  # Added import for fuzzy matching

# Configure logging
logging.basicConfig(
    filename='scraper.log',
    filemode='a',
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.DEBUG  # Changed to DEBUG for detailed logs
)

# Define base URL for pai.pt
base_url = "https://www.pai.pt"

# Helper function to normalize text by removing punctuation, converting to lowercase, and removing accents
def normalize(text):
    # Remove punctuation
    translator = str.maketrans('', '', string.punctuation)
    text = text.translate(translator)
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove accents
    text = ''.join(
        char for char in unicodedata.normalize('NFKD', text)
        if not unicodedata.combining(char)
    )
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    return text

# Function to perform search and extract company link
def search_company(company_name, session):
    # Normalize the company name for comparison
    normalized_company_name = normalize(company_name)
    logging.debug(f"Normalized company name: '{normalized_company_name}'")
    
    # Construct the search URL using the correct format
    search_url = (
        f"{base_url}/searches?search%5Bquery%5D={company_name.replace(' ', '+')}"
        "&search%5Bne%5D=42.1541%2C-6.4969&search%5Bsw%5D=32.2099%2C-29.8597"
        "&search%5Bcenter%5D=&search%5Bmap%5D=&search%5Blocation_id%5D=1"
        "&search%5Bcategory_id%5D=&search%5Btag_id%5D=&search%5Bgroup_id%5D="
        "&search%5Blocation_value%5D=Portugal&search%5Blocation%5D=Portugal&commit=Procurar"
    )
    
    try:
        response = session.get(search_url)
        response.raise_for_status()
    except requests.RequestException as e:
        logging.error(f"Failed to retrieve search page for '{company_name}'. Error: {e}")
        return None
    
    soup = BeautifulSoup(response.text, 'html.parser')

    # Adjust the selector based on actual HTML structure
    search_results = soup.find('div', class_='search-results')  # Example; adjust if necessary
    if not search_results:
        logging.warning(f"No search results section found for '{company_name}'.")
        return None

    # Find all relevant company links within the search results
    companies = search_results.find_all('a', href=True)
    logging.info(f"Found {len(companies)} links in the search results for '{company_name}'.")
    print(f"Found {len(companies)} links in the search results for '{company_name}'.")

    for company in companies:
        company_text = company.get_text().strip()
        normalized_company_text = normalize(company_text)
        logging.debug(f"Original company text: '{company_text}'")
        logging.debug(f"Normalized search result text: '{normalized_company_text}'")
        
        # Skip empty or irrelevant links
        if not company_text:
            continue

        logging.info(f"Company in results: {company_text}")
        print(f"Company in results: {company_text}")

        # Exact Match
        if normalized_company_name == normalized_company_text:
            logging.info(f"Exact matched company: {company_text}")
            print(f"Exact matched company: {company_text}")
            # Ensure the href starts with '/' to correctly append to the base URL
            href = company['href']
            if not href.startswith('/'):
                href = '/' + href
            company_url = base_url + href
            logging.info(f"Company URL: {company_url}")
            print(f"Company URL: {company_url}")
            return company_url
        
        # Fuzzy Match (Optional)
        similarity = fuzz.token_sort_ratio(normalized_company_name, normalized_company_text)
        logging.debug(f"Fuzzy similarity between '{normalized_company_name}' and '{normalized_company_text}': {similarity}")
        if similarity >= 90:  # Threshold can be adjusted
            logging.info(f"Fuzzy matched company: {company_text} with similarity {similarity}")
            print(f"Fuzzy matched company: {company_text} with similarity {similarity}")
            href = company['href']
            if not href.startswith('/'):
                href = '/' + href
            company_url = base_url + href
            logging.info(f"Company URL: {company_url}")
            print(f"Company URL: {company_url}")
            return company_url

    logging.warning(f"Company '{company_name}' not found in the search results.")
    print(f"Company '{company_name}' not found in the search results.")
    return None

# Function to extract company summary (average rating and total reviews)
def extract_company_summary(company_url, session):
    try:
        response = session.get(company_url)
        response.raise_for_status()
    except requests.RequestException as e:
        logging.error(f"Failed to retrieve company page '{company_url}'. Error: {e}")
        return {'Average Rating': 'N/A', 'Total Reviews': 'N/A'}
    
    soup = BeautifulSoup(response.text, 'html.parser')

    # Find the reviews-container
    reviews_container = soup.find('div', class_='reviews-container expandable-container')
    if not reviews_container:
        logging.warning(f"No reviews container found on '{company_url}'.")
        return {'Average Rating': 'N/A', 'Total Reviews': 'N/A'}

    # Extract Average Rating
    rating_div = reviews_container.find('div', class_='rating-review mb-10 mt-10')
    if rating_div:
        filled_stars = len(rating_div.find_all('span', class_='star filled'))
        half_filled_stars = len(rating_div.find_all('span', class_='star half-filled'))
        average_rating = filled_stars + 0.5 * half_filled_stars
    else:
        average_rating = 'N/A'

    # Extract Total Reviews
    total_reviews_p = reviews_container.find('p')
    if total_reviews_p:
        total_reviews_text = total_reviews_p.get_text(strip=True)
        # Extract number from text, e.g., "731 avaliações"
        total_reviews = ''.join(filter(str.isdigit, total_reviews_text))
    else:
        total_reviews = 'N/A'

    logging.info(f"Extracted summary for '{company_url}': Average Rating={average_rating}, Total Reviews={total_reviews}")
    print(f"Extracted summary: Average Rating={average_rating}, Total Reviews={total_reviews}")
    return {'Average Rating': average_rating, 'Total Reviews': total_reviews}

# Function to extract reviews from company page
def extract_reviews(company_url, session):
    reviews = []
    page_number = 1

    while True:
        page_url = f"{company_url}?reviews_page={page_number}"
        try:
            response = session.get(page_url)
            response.raise_for_status()
        except requests.RequestException as e:
            logging.error(f"Failed to retrieve reviews page {page_number} for '{company_url}'. Error: {e}")
            break

        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all review containers
        review_containers = soup.find_all('div', class_='review-container')

        if not review_containers:
            logging.info(f"No more reviews found on page {page_number} for '{company_url}'.")
            print(f"No more reviews found on page {page_number} for '{company_url}'.")
            break  # Stop if no more reviews are found

        for review in review_containers:
            try:
                # Extract User Name
                user_tag = review.find('strong', class_='ml-5')
                user = user_tag.get_text(strip=True) if user_tag else 'N/A'

                # Extract Rating (number of filled stars)
                rating_tags = review.find('div', class_='rating-review-small').find_all('span', class_='star filled')
                rating = len(rating_tags) if rating_tags else 0

                # Extract Review Text
                review_text_tag = review.find('div', class_='review-content mb-10')
                review_text = review_text_tag.get_text(strip=True) if review_text_tag else 'N/A'

                # Extract Date
                review_meta = review.find('div', class_='review-meta')
                if review_meta:
                    # Find all spans with class 'ml-5' within review-meta
                    ml5_spans = review_meta.find_all('span', class_='ml-5')
                    if len(ml5_spans) >= 2:
                        date = ml5_spans[1].get_text(strip=True)
                    else:
                        date = 'N/A'
                else:
                    date = 'N/A'

                reviews.append({
                    'User': user,
                    'Rating': rating,
                    'Review': review_text,
                    'Date': date
                })
            except AttributeError as e:
                logging.error(f"Failed to parse a review. Error: {e}")
                logging.debug(f"Review HTML: {review.prettify()}")
                print(f"Failed to parse a review. Error: {e}")
                continue

        logging.info(f"Processed page {page_number} for '{company_url}'. Extracted {len(review_containers)} reviews.")
        print(f"Processed page {page_number} for '{company_url}'. Extracted {len(review_containers)} reviews.")

        # Check if there is a "Next" button for pagination
        next_button = soup.find('a', rel='next')
        if not next_button:
            logging.info(f"No next page button found on page {page_number} for '{company_url}'.")
            print(f"No next page button found on page {page_number} for '{company_url}'.")
            break

        page_number += 1
        time.sleep(2)  # Optional delay to avoid overwhelming the server

    return reviews

# Function to read company names from a text file
def read_companies_from_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            companies = [line.strip() for line in file if line.strip()]
        logging.info(f"Read {len(companies)} companies from '{file_path}'.")
        print(f"Read {len(companies)} companies from '{file_path}'.")
        return companies
    except FileNotFoundError:
        logging.error(f"The file '{file_path}' was not found.")
        print(f"The file '{file_path}' was not found.")
        return []
    except Exception as e:
        logging.error(f"An error occurred while reading '{file_path}'. Error: {e}")
        print(f"An error occurred while reading '{file_path}'. Error: {e}")
        return []

# Function to archive company link and reviews to a text file
def archive_to_text(company_name, company_url, reviews, average_rating, total_reviews, archive_file='archived_reviews.txt'):
    try:
        with open(archive_file, 'a', encoding='utf-8') as file:
            file.write(f"Company Name: {company_name}\n")
            file.write(f"Company URL: {company_url}\n")
            file.write(f"Average Rating: {average_rating}\n")
            file.write(f"Total Reviews: {total_reviews}\n")
            file.write(f"Number of Reviews Extracted: {len(reviews)}\n")
            file.write("Reviews:\n")
            for idx, review in enumerate(reviews, 1):
                file.write(f"  Review {idx}:\n")
                file.write(f"    User: {review['User']}\n")
                file.write(f"    Rating: {review['Rating']}/5\n")
                file.write(f"    Date: {review['Date']}\n")
                file.write(f"    Review Text: {review['Review']}\n")
                file.write("\n")
            file.write("="*80 + "\n\n")  # Separator between companies
        logging.info(f"Archived data for '{company_name}' to '{archive_file}'.")
        print(f"Archived data for '{company_name}' to '{archive_file}'.")
    except Exception as e:
        logging.error(f"Failed to archive data for '{company_name}'. Error: {e}")
        print(f"Failed to archive data for '{company_name}'. Error: {e}")

# Function to save company summary to a CSV file
def save_company_summary(summary, summary_file='company_summary.csv'):
    df = pd.DataFrame(summary)
    try:
        if not os.path.exists(summary_file):
            df.to_csv(summary_file, index=False, encoding='utf-8')
        else:
            df.to_csv(summary_file, index=False, mode='a', header=False, encoding='utf-8')
        logging.info(f"Saved company summary to '{summary_file}'.")
        print(f"Saved company summary to '{summary_file}'.")
    except Exception as e:
        logging.error(f"Failed to save company summary to CSV. Error: {e}")
        print(f"Failed to save company summary to CSV. Error: {e}")

# Setup session with retries and headers
def create_session():
    session = requests.Session()
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                      'Chrome/90.0.4430.93 Safari/537.36'
    }
    session.headers.update(headers)

    # Setup retries
    retry = Retry(
        total=5,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS"]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)

    return session

# Main execution
def main():
    # Read companies from a text file (Ensure that each company name is on a new line)
    company_file = 'companies.txt'  # Path to your text file with company names
    companies = read_companies_from_file(company_file)

    if not companies:
        logging.info("No companies to process. Exiting.")
        print("No companies to process. Exiting.")
        return

    # Setup requests session
    session = create_session()

    # Initialize company summary list
    company_summary = []

    # Loop through companies and extract reviews
    all_reviews = []
    for company in companies:
        logging.info(f"\nSearching for '{company}'...")
        print(f"\nSearching for '{company}'...")
        company_url = search_company(company, session)
        
        if company_url:
            logging.info(f"Extracting company summary from '{company_url}'...")
            print(f"Extracting company summary from '{company_url}'...")
            summary = extract_company_summary(company_url, session)
            average_rating = summary.get('Average Rating', 'N/A')
            total_reviews = summary.get('Total Reviews', 'N/A')

            logging.info(f"Extracting reviews from '{company_url}'...")
            print(f"Extracting reviews from '{company_url}'...")
            reviews = extract_reviews(company_url, session)
            if reviews:
                logging.info(f"Extracted {len(reviews)} reviews for '{company}'.")
                print(f"Extracted {len(reviews)} reviews for '{company}'.")
                all_reviews.extend(reviews)
                
                # Archive the company URL and its reviews to a text file
                archive_to_text(company, company_url, reviews, average_rating, total_reviews)
            else:
                logging.info(f"No reviews found for '{company}'.")
                print(f"No reviews found for '{company}'.")

            # Append to company summary
            company_summary.append({
                'Company Name': company,
                'Company URL': company_url,
                'Average Rating': average_rating,
                'Total Reviews': total_reviews
            })
        else:
            logging.warning(f"Company '{company}' not found.")
            print(f"Company '{company}' not found.")
            # Append to company summary with N/A
            company_summary.append({
                'Company Name': company,
                'Company URL': 'N/A',
                'Average Rating': 'N/A',
                'Total Reviews': 'N/A'
            })
    
    # Save company summary to CSV
    if company_summary:
        save_company_summary(company_summary, 'company_summary.csv')
    else:
        logging.info("No company summaries to save.")

    # Save the extracted reviews to a CSV file
    if all_reviews:
        df = pd.DataFrame(all_reviews)
        try:
            df.to_csv("company_reviews.csv", index=False, encoding='utf-8')
            logging.info("Reviews saved to 'company_reviews.csv'")
            print("\nReviews saved to 'company_reviews.csv'")
        except Exception as e:
            logging.error(f"Failed to save reviews to CSV. Error: {e}")
            print(f"Failed to save reviews to CSV. Error: {e}")
    else:
        logging.info("No reviews found for any company.")
        print("\nNo reviews found for any company.")

if __name__ == "__main__":
    main()
