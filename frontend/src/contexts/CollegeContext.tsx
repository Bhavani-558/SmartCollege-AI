import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { collegeService } from "../services/collegeService";
import { normalizeApiError } from "../services/api";
import type {
  CollegeDetailResponse,
  CollegeFAQListResponse,
  CollegeSummary,
  HealthResponse,
} from "../types/api";

export interface CollegeContextValue {
  colleges: CollegeSummary[];
  selectedCollegeId: string | null;
  selectedCollege: CollegeSummary | null;
  collegeDetail: CollegeDetailResponse | null;
  collegeFaqs: CollegeFAQListResponse | null;
  supportedCategories: string[];
  backendHealth: HealthResponse | null;
  isLoadingColleges: boolean;
  isSelectingCollege: boolean;
  collegeError: string | null;
  lastSwitchNotice: string | null;
  contextVersion: number;
  refreshColleges: () => Promise<void>;
  selectCollege: (collegeId: string | null) => Promise<boolean>;
  clearCollegeError: () => void;
}

const CollegeContext = createContext<CollegeContextValue | undefined>(undefined);

export const CollegeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [colleges, setColleges] = useState<CollegeSummary[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(null);
  const [selectedCollege, setSelectedCollege] = useState<CollegeSummary | null>(null);
  const [collegeDetail, setCollegeDetail] = useState<CollegeDetailResponse | null>(null);
  const [collegeFaqs, setCollegeFaqs] = useState<CollegeFAQListResponse | null>(null);
  const [supportedCategories, setSupportedCategories] = useState<string[]>([]);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);

  const [isLoadingColleges, setIsLoadingColleges] = useState<boolean>(true);
  const [isSelectingCollege, setIsSelectingCollege] = useState<boolean>(false);
  const [collegeError, setCollegeError] = useState<string | null>(null);
  const [lastSwitchNotice, setLastSwitchNotice] = useState<string | null>(null);
  const [contextVersion, setContextVersion] = useState<number>(0);

  const activeSelectRequestRef = useRef<number>(0);

  const refreshColleges = useCallback(async () => {
    setIsLoadingColleges(true);
    setCollegeError(null);
    try {
      const [collegesResp, healthResp] = await Promise.all([
        collegeService.listColleges(),
        collegeService.getHealth().catch(() => null),
      ]);
      setColleges(collegesResp.colleges);
      if (healthResp) {
        setBackendHealth(healthResp);
      }
    } catch (error) {
      const apiErr = normalizeApiError(error);
      setCollegeError(apiErr.message);
    } finally {
      setIsLoadingColleges(false);
    }
  }, []);

  useEffect(() => {
    void refreshColleges();
  }, [refreshColleges]);

  const selectCollege = useCallback(
    async (collegeId: string | null): Promise<boolean> => {
      const normalizedId = collegeId?.trim() || null;

      if (!normalizedId) {
        activeSelectRequestRef.current += 1;
        setSelectedCollegeId(null);
        setSelectedCollege(null);
        setCollegeDetail(null);
        setCollegeFaqs(null);
        setSupportedCategories([]);
        setLastSwitchNotice(
          "Cleared college selection. You are in General Assistant mode.",
        );
        setCollegeError(null);
        setContextVersion((prev) => prev + 1);
        return true;
      }

      const requestToken = ++activeSelectRequestRef.current;
      const previousCollegeId = selectedCollegeId;
      setIsSelectingCollege(true);
      setCollegeError(null);

      try {
        const [selectResp, detailResp, faqsResp] = await Promise.all([
          collegeService.selectCollege(normalizedId, previousCollegeId),
          collegeService.getCollegeDetail(normalizedId),
          collegeService.getCollegeFaqs(normalizedId),
        ]);

        // Guard against stale out-of-order responses if user switched rapidly.
        if (requestToken !== activeSelectRequestRef.current) {
          return false;
        }

        setSelectedCollegeId(selectResp.selected_college.college_id);
        setSelectedCollege(selectResp.selected_college);
        setCollegeDetail(detailResp);
        setCollegeFaqs(faqsResp);
        setSupportedCategories(selectResp.supported_categories);
        setLastSwitchNotice(selectResp.message);
        setContextVersion((prev) => prev + 1);
        return true;
      } catch (error) {
        if (requestToken === activeSelectRequestRef.current) {
          const apiErr = normalizeApiError(error);
          setCollegeError(apiErr.message);
        }
        return false;
      } finally {
        if (requestToken === activeSelectRequestRef.current) {
          setIsSelectingCollege(false);
        }
      }
    },
    [selectedCollegeId],
  );

  const clearCollegeError = useCallback(() => {
    setCollegeError(null);
  }, []);

  const value = useMemo<CollegeContextValue>(
    () => ({
      colleges,
      selectedCollegeId,
      selectedCollege,
      collegeDetail,
      collegeFaqs,
      supportedCategories,
      backendHealth,
      isLoadingColleges,
      isSelectingCollege,
      collegeError,
      lastSwitchNotice,
      contextVersion,
      refreshColleges,
      selectCollege,
      clearCollegeError,
    }),
    [
      colleges,
      selectedCollegeId,
      selectedCollege,
      collegeDetail,
      collegeFaqs,
      supportedCategories,
      backendHealth,
      isLoadingColleges,
      isSelectingCollege,
      collegeError,
      lastSwitchNotice,
      contextVersion,
      refreshColleges,
      selectCollege,
      clearCollegeError,
    ],
  );

  return (
    <CollegeContext.Provider value={value}>{children}</CollegeContext.Provider>
  );
};

export function useCollege(): CollegeContextValue {
  const ctx = useContext(CollegeContext);
  if (!ctx) {
    throw new Error("useCollege must be used inside a CollegeProvider.");
  }
  return ctx;
}

