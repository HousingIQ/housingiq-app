"""
FHFA HPI Data Source Configuration.

Central configuration for FHFA House Price Index data download and processing.
"""

# Master CSV URL containing all HPI data
MASTER_CSV_URL = "https://www.fhfa.gov/hpi/download/monthly/hpi_master.csv"

# Download settings
DOWNLOAD_SETTINGS = {
    "timeout": 60,
    "retry_attempts": 3,
    "retry_delay": 2.0,
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

# Filter settings for transformation
INCLUDED_HPI_TYPES = ["purchase-only"]
INCLUDED_FREQUENCIES = ["monthly", "quarterly"]
INCLUDED_LEVELS = ["USA", "State", "MSA"]
