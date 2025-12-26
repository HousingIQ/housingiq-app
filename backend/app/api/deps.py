"""API dependencies for dependency injection.

This module provides dependencies that can be injected into endpoints,
such as database sessions, authentication, and services.
"""

from typing import Annotated

from fastapi import Depends

from app.services.mock_data import MockDataService, get_mock_data_service

# Type alias for injecting the mock data service
MockDataDep = Annotated[MockDataService, Depends(get_mock_data_service)]

# Future dependencies will be added here:
# DBSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
# CurrentUserDep = Annotated[User, Depends(get_current_user)]

