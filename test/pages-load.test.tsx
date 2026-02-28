import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  useMutation: vi.fn(() => vi.fn()),
  useParams: vi.fn(() => ({ id: "project-1", roomId: "room-1" })),
  useQuery: vi.fn(() => undefined),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSession: vi.fn(() => ({ data: null, isPending: false })),
  sendVerificationOtp: vi.fn(),
  signInEmailOtp: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: (props: ComponentProps<"img">) => <img {...props} alt={props.alt ?? ""} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: mocks.useParams,
  useRouter: mocks.useRouter,
}));

vi.mock("convex/react", () => ({
  useMutation: mocks.useMutation,
  useQuery: mocks.useQuery,
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: mocks.useSession,
    emailOtp: {
      sendVerificationOtp: mocks.sendVerificationOtp,
    },
    signIn: {
      emailOtp: mocks.signInEmailOtp,
    },
  },
}));

import DashboardPage from "@/app/(with-navbar)/dashboard/page";
import DiscoverPage from "@/app/(with-navbar)/discover/page";
import LandingPage from "@/app/(with-navbar)/page";
import ProjectPage from "@/app/(with-navbar)/project/[id]/page";
import RoomPage from "@/app/(with-navbar)/project/[id]/rooms/[roomId]/page";
import StylePage from "@/app/(with-navbar)/style/page";
import SignInPage from "@/app/sign-in/page";

describe("page route loading", () => {
  beforeEach(() => {
    cleanup();
    mocks.useMutation.mockImplementation(() => vi.fn());
    mocks.useParams.mockReturnValue({ id: "project-1", roomId: "room-1" });
    mocks.useQuery.mockReturnValue(undefined);
    mocks.useRouter.mockReturnValue({ push: vi.fn() });
    mocks.useSession.mockReturnValue({ data: null, isPending: false });
  });

  it("loads public pages", () => {
    render(<LandingPage />);
    expect(screen.getByText("Transform Your Space with AI-Powered Design")).toBeInTheDocument();

    cleanup();
    render(<SignInPage />);
    expect(screen.getByText("Welcome to Interior Advisor")).toBeInTheDocument();
  });

  it("loads protected and dynamic pages in their initial states", () => {
    mocks.useSession.mockReturnValue({ data: null, isPending: true });
    render(<DashboardPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    cleanup();
    render(<DiscoverPage />);
    expect(screen.getByText("Discover Your Style")).toBeInTheDocument();

    cleanup();
    render(<StylePage />);
    expect(screen.getByText("Loading style profile...")).toBeInTheDocument();

    cleanup();
    render(<ProjectPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    cleanup();
    render(<RoomPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
