import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

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
    title: str
    parent_id: uuid.UUID | None = None
    latex_source: str = DEFAULT_LATEX_TEMPLATE


class ResumeUpdate(BaseModel):
    title: str | None = None
    latex_source: str | None = None


class ResumeResponse(BaseModel):
    id: uuid.UUID
    user_id: str
    parent_id: uuid.UUID | None
    title: str
    latex_source: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
