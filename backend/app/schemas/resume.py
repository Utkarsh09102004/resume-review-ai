import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

DEFAULT_LATEX_TEMPLATE = r"""\documentclass[a4paper,10pt]{article}
\usepackage[margin=1in]{geometry}
\begin{document}

\begin{center}
{\LARGE \textbf{Your Name}}\\[4pt]
email@example.com \textbar\ (555) 123-4567 \textbar\ City, State
\end{center}

\section*{Experience}
\textbf{Job Title} \hfill Company Name\\
\textit{Start Date -- End Date}
\begin{itemize}
  \item Accomplishment or responsibility
\end{itemize}

\section*{Education}
\textbf{Degree} \hfill Institution\\
\textit{Graduation Date}

\end{document}
"""


class ResumeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    parent_id: uuid.UUID | None = None
    latex_source: str | None = Field(default=None, max_length=500_000)


class ResumeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    latex_source: str | None = Field(default=None, max_length=500_000)

    @field_validator("title", mode="before")
    @classmethod
    def title_not_null(cls, v: Any) -> Any:
        if v is None:
            raise ValueError("title must not be null")
        return v


class ResumeResponse(BaseModel):
    id: uuid.UUID
    user_id: str
    parent_id: uuid.UUID | None
    title: str
    latex_source: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
