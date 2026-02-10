# Interior Advisor - Requirements Document

## Project Goal

Interior Advisor is an AI-powered home interior design assistant that democratizes professional interior design advice. The app enables users to:

1. **Understand their space** - Upload room photos and receive detailed AI analysis of furniture, lighting, colors, and layout
2. **Discover their style** - Complete an interactive quiz to identify personal design preferences
3. **Get actionable recommendations** - Receive two tiers of suggestions: quick affordable wins and larger transformations
4. **Visualize changes** - See AI-generated images of how recommendations would look in their actual space
5. **Stay within budget** - Track spending and filter recommendations by cost

The app targets individual homeowners and renters who want professional-quality design guidance without hiring an interior designer.

---

## User Workflow

### Overview Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Landing   │────▶│  Discovery  │────▶│   Project   │────▶│    Room     │
│    Page     │     │    Quiz     │     │   Setup     │     │   Upload    │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
      ┌────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Scene     │────▶│  Review     │────▶│  Generate   │────▶│  Visualize  │
│  Analysis   │     │  Analysis   │     │   Advice    │     │  & Compare  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Detailed User Journey

#### 1. Landing & Onboarding
- User arrives at landing page
- Sees value proposition and example transformations
- Clicks "Get Started" to begin

#### 2. Style Discovery (Optional but Recommended)
- **Step 1**: Image preference quiz - user selects preferred rooms from pairs
- **Step 2**: Mood board selection - user picks inspiring room images
- **Step 3**: Priority sliders - user balances comfort vs. aesthetics, minimal vs. cozy, etc.
- **Result**: Generated style profile (e.g., "Modern Scandinavian with warm accents")

#### 3. Project Creation
- User names their project (e.g., "Apartment Refresh 2024")
- Sets overall budget (optional)
- Defines constraints:
  - Rental-friendly (no permanent changes)
  - Pet-friendly (durable materials)
  - Child-friendly (safe designs)
  - Accessibility needs

#### 4. Room Setup
- User adds rooms to the project
- For each room:
  - Names the room (e.g., "Living Room")
  - Selects room type from list
  - Optionally adds dimensions
  - Adds notes about specific concerns

#### 5. Photo Upload & Analysis
- User uploads 1-3 photos of the room
- Marks one as primary view
- AI analysis runs automatically (5-15 seconds)
- Results displayed:
  - Detected furniture with style tags
  - Lighting assessment
  - Color palette visualization
  - Layout observations
  - Current style identification

#### 6. Review & Refine Analysis
- User reviews AI findings
- Can correct misidentifications
- Adds context AI might have missed
- Confirms readiness for recommendations

#### 7. Recommendation Generation
- User selects recommendation tier:
  - **Quick Wins**: Budget-friendly, easy changes
  - **Transformations**: Larger investments
- AI generates personalized suggestions
- Each recommendation includes:
  - What to do and why
  - Estimated cost range
  - Difficulty level
  - Expected impact

#### 8. Visualization
- User selects recommendations to visualize
- AI generates before/after images
- Interactive comparison slider
- Can regenerate with tweaked prompts
- Save favorites to project

#### 9. Action Planning
- User marks recommendations as "interested" or "skip"
- Views total estimated cost
- Sees matched products (future feature)
- Exports action plan

---

## Functional Requirements

### FR-1: User Session Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | System shall generate anonymous session ID on first visit | Must |
| FR-1.2 | Session ID shall persist in localStorage | Must |
| FR-1.3 | All user data shall be associated with session ID | Must |
| FR-1.4 | User shall be able to access projects from same device/browser | Must |
| FR-1.5 | System shall not require email or password for basic usage | Must |

### FR-2: Style Discovery Module

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | System shall present image-based style preference quiz | Must |
| FR-2.2 | Quiz shall include minimum 10 comparison pairs | Should |
| FR-2.3 | System shall provide mood board selection with 20+ curated images | Should |
| FR-2.4 | System shall include preference sliders for design trade-offs | Should |
| FR-2.5 | System shall calculate and store style profile from quiz responses | Must |
| FR-2.6 | Style profile shall identify primary and secondary styles | Must |
| FR-2.7 | User shall be able to skip discovery and proceed directly | Must |
| FR-2.8 | User shall be able to retake quiz to update preferences | Should |

### FR-3: Project Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | User shall be able to create multiple projects | Must |
| FR-3.2 | Each project shall have a name and optional description | Must |
| FR-3.3 | User shall be able to set project-level budget | Should |
| FR-3.4 | User shall be able to define project constraints | Must |
| FR-3.5 | Constraints shall include: rental-friendly, pet-friendly, child-friendly, accessibility | Must |
| FR-3.6 | User shall be able to delete projects | Must |
| FR-3.7 | Projects shall display creation date and last modified date | Should |
| FR-3.8 | Dashboard shall show all user projects with status | Must |

### FR-4: Room Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | User shall be able to add multiple rooms to a project | Must |
| FR-4.2 | Each room shall have a name and type | Must |
| FR-4.3 | Room types shall include: Living Room, Bedroom, Kitchen, Bathroom, Dining Room, Office, Other | Must |
| FR-4.4 | User shall be able to add optional room dimensions | Should |
| FR-4.5 | User shall be able to add notes/concerns for each room | Should |
| FR-4.6 | User shall be able to delete rooms | Must |
| FR-4.7 | Rooms shall display analysis status (pending, complete, failed) | Must |

### FR-5: Photo Upload & Storage

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | User shall be able to upload photos for each room | Must |
| FR-5.2 | System shall accept JPEG, PNG, and WebP formats | Must |
| FR-5.3 | System shall accept images up to 10MB | Must |
| FR-5.4 | System shall resize images to max 2048px for storage optimization | Should |
| FR-5.5 | User shall be able to upload 1-5 photos per room | Must |
| FR-5.6 | User shall be able to mark one photo as primary | Must |
| FR-5.7 | User shall be able to delete uploaded photos | Must |
| FR-5.8 | System shall display upload progress indicator | Should |
| FR-5.9 | System shall show thumbnail previews of uploaded photos | Must |

### FR-6: AI Scene Analysis

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | System shall automatically trigger analysis on photo upload | Must |
| FR-6.2 | Analysis shall detect and list furniture items | Must |
| FR-6.3 | Analysis shall assess natural and artificial lighting | Must |
| FR-6.4 | Analysis shall extract color palette (dominant and accent colors) | Must |
| FR-6.5 | Analysis shall evaluate room layout and flow | Must |
| FR-6.6 | Analysis shall identify current design style | Must |
| FR-6.7 | System shall display analysis progress indicator | Must |
| FR-6.8 | System shall handle analysis failures gracefully with retry option | Must |
| FR-6.9 | Analysis results shall be stored and cached | Must |
| FR-6.10 | User shall be able to view detailed analysis breakdown | Must |

### FR-7: Recommendation Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | System shall generate recommendations based on analysis + user profile | Must |
| FR-7.2 | Recommendations shall be split into two tiers | Must |
| FR-7.3 | Quick Wins tier: items under $200, DIY-friendly | Must |
| FR-7.4 | Transformations tier: items $200-2000, may need professional help | Must |
| FR-7.5 | Each recommendation shall include title, description, reasoning | Must |
| FR-7.6 | Each recommendation shall include estimated cost range | Must |
| FR-7.7 | Each recommendation shall include impact rating (high/medium/low) | Must |
| FR-7.8 | Each recommendation shall include difficulty level | Must |
| FR-7.9 | Recommendations shall respect project constraints | Must |
| FR-7.10 | Quick Wins shall generate 3-5 recommendations | Should |
| FR-7.11 | Transformations shall generate 2-4 recommendations | Should |
| FR-7.12 | User shall be able to regenerate recommendations | Should |

### FR-8: Visualization Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-8.1 | User shall be able to generate visualization for any recommendation | Must |
| FR-8.2 | Visualization shall use original room photo as base | Must |
| FR-8.3 | System shall use ControlNet to preserve room structure | Must |
| FR-8.4 | System shall display generation progress indicator | Must |
| FR-8.5 | Generated images shall be stored for future viewing | Must |
| FR-8.6 | User shall be able to compare before/after with slider | Must |
| FR-8.7 | User shall be able to regenerate with different settings | Should |
| FR-8.8 | User shall be able to adjust visualization prompt | Should |
| FR-8.9 | System shall support multiple visualization types (full render, item change, color change) | Should |
| FR-8.10 | User shall be able to save favorite visualizations | Should |

### FR-9: Budget Tracking

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-9.1 | User shall be able to set project budget | Should |
| FR-9.2 | System shall display running total of selected recommendations | Should |
| FR-9.3 | System shall show remaining budget | Should |
| FR-9.4 | User shall be able to filter recommendations by cost | Should |
| FR-9.5 | System shall warn when selections exceed budget | Should |

### FR-10: Product Matching (Future)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10.1 | System shall match recommendations to real products | Could |
| FR-10.2 | Product matches shall include price, image, and purchase link | Could |
| FR-10.3 | System shall show multiple product options per recommendation | Could |
| FR-10.4 | Products shall be filtered by budget constraints | Could |
| FR-10.5 | System shall indicate product availability | Could |

---

## Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1.1 | Page load time (initial) | < 3 seconds |
| NFR-1.2 | Page navigation (subsequent) | < 500ms |
| NFR-1.3 | Photo upload feedback | Immediate progress indicator |
| NFR-1.4 | Scene analysis completion | < 20 seconds |
| NFR-1.5 | Recommendation generation | < 10 seconds |
| NFR-1.6 | Visualization generation | < 60 seconds |

### NFR-2: Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-2.1 | Application uptime | 99.5% |
| NFR-2.2 | Data persistence | No data loss on refresh |
| NFR-2.3 | AI service fallback | Graceful degradation with retry |
| NFR-2.4 | Error recovery | Clear error messages with actions |

### NFR-3: Usability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-3.1 | Mobile responsive | Full functionality on mobile |
| NFR-3.2 | Accessibility | WCAG 2.1 AA compliance |
| NFR-3.3 | Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| NFR-3.4 | Onboarding completion | < 5 minutes to first analysis |

### NFR-4: Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-4.1 | Concurrent users | 1000+ simultaneous |
| NFR-4.2 | Projects per user | Unlimited |
| NFR-4.3 | Rooms per project | Up to 20 |
| NFR-4.4 | Photos per room | Up to 5 |

### NFR-5: Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-5.1 | Data transmission | HTTPS only |
| NFR-5.2 | File upload validation | Type and size verification |
| NFR-5.3 | API key protection | Server-side only, never exposed |
| NFR-5.4 | Session isolation | Users cannot access others' data |

---

## User Interface Requirements

### UI-1: Landing Page
- Hero section with value proposition
- Example before/after transformations
- Clear "Get Started" call-to-action
- Brief feature overview

### UI-2: Discovery Quiz
- Full-screen immersive experience
- Large, high-quality comparison images
- Progress indicator
- Skip option always visible
- Results summary with style breakdown

### UI-3: Dashboard
- Project cards in grid layout
- Quick stats per project (rooms, recommendations)
- Create new project button
- Empty state with guidance

### UI-4: Project Workspace
- Room list sidebar or tabs
- Budget overview widget
- Project settings access
- Add room button

### UI-5: Room View
- Photo gallery with primary image prominent
- Analysis results in collapsible sections
- Recommendation cards with tier toggle
- Visualization gallery

### UI-6: Analysis Display
- Visual furniture map overlay (future)
- Color palette swatches
- Lighting assessment icons
- Style confidence meter

### UI-7: Recommendation Cards
- Clear title and description
- Cost badge
- Impact and difficulty indicators
- "Visualize" action button
- "Interested" / "Skip" selection

### UI-8: Visualization Comparison
- Before/after slider (draggable divider)
- Side-by-side toggle option
- Zoom and pan capability
- Download option
- Regenerate button

---

## Constraints & Assumptions

### Technical Constraints
- No server-side rendering for AI operations (use Convex actions)
- Image generation limited by Replicate rate limits
- OpenAI API token limits per request
- localStorage limits (~5MB) for session data

### Business Constraints
- No user authentication in initial release
- No payment processing
- No real-time collaboration features
- English language only initially

### Assumptions
- Users have modern browsers with JavaScript enabled
- Users have reliable internet connection
- Users consent to photo upload and AI processing
- Room photos are reasonably well-lit and clear
- AI services (OpenAI, Replicate) maintain current pricing/availability

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Quiz completion rate | > 60% | Users who start discovery and complete |
| Photos uploaded per session | > 2 | Average photos uploaded |
| Recommendations generated | > 80% | Sessions that reach recommendation stage |
| Visualizations requested | > 50% | Users who generate at least one visualization |
| Return visits | > 30% | Users who return within 7 days |
| Session duration | > 8 minutes | Average time in app |

---

## Future Enhancements (Out of Scope for v1)

1. **User Accounts** - Email/social login with cross-device sync
2. **Collaboration** - Share projects with family/roommates
3. **AR Preview** - View furniture in space via phone camera
4. **Professional Connect** - Hire designers for implementation
5. **E-commerce Integration** - Direct purchase from recommendations
6. **Style Communities** - Share and discover design inspiration
7. **Multi-language** - Support for additional languages
8. **Contractor Matching** - Connect with local professionals
