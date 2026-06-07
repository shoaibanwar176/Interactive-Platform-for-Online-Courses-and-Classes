import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/Card";
import { Search, Compass, Eye, CheckCircle, ArrowRight } from "lucide-react";
import api from "../../services/api";

interface CourseExploreProps {
  onSelectCourse: (courseId: string) => void;
}

export const CourseExplore: React.FC<CourseExploreProps> = ({ onSelectCourse }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const loadData = async () => {
    try {
      const [coursesRes, enrollsRes] = await Promise.all([
        api.get("/courses"),
        api.get(`/users/${user?.id}/enrollments`)
      ]);
      setCourses(coursesRes.data);
      setEnrollments(enrollsRes.data);
    } catch (err) {
      console.error("Failed to fetch course catalogues explore data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    try {
      await api.post("/enrollments", {
        studentId: user.id,
        courseId
      });
      // Refresh enrollments
      const enrollsRes = await api.get(`/users/${user.id}/enrollments`);
      setEnrollments(enrollsRes.data);
    } catch (err) {
      console.error("Enrollment failed", err);
    }
  };

  const isEnrolled = (courseId: string) => {
    return enrollments.some(e => e.courseId === courseId);
  };

  // Filter courses based on search & category pill
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedFilter === "All" || c.category === selectedFilter;
    return matchesSearch && matchesCategory;
  });

  // Unique categories list
  const categories = ["All", ...Array.from(new Set(courses.map(c => c.category)))];

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Search and Category navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search courses, frameworks, concepts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-gray-150 bg-white pl-10 pr-4 py-2.5 text-xs outline-hidden transition-all focus:border-blue-500"
          />
        </div>

        {/* Categories Pills Row */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`rounded-xl px-4 py-2 text-3xs font-bold leading-none transition-all active:scale-95 ${
                selectedFilter === cat
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid listing */}
      {filteredCourses.length === 0 ? (
        <Card className="py-16 text-center text-sm text-gray-400">
          <Compass className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <span>No courses matched your query. Try rephrasing search criteria.</span>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map(course => {
            const enrolled = isEnrolled(course.id);
            return (
              <Card key={course.id} hoverable className="flex flex-col h-full justify-between overflow-hidden">
                <div className="space-y-3">
                  {/* Class Cap Photo */}
                  <div className="relative h-40 w-full overflow-hidden rounded-xl border border-gray-50 bg-gray-100">
                    <img
                      src={course.coverImage}
                      alt={course.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <span className="absolute top-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-4xs font-mono font-bold text-gray-800 backdrop-blur-md shadow-xs">
                      {course.difficulty}
                    </span>
                  </div>

                  {/* Syllabus Brief */}
                  <div className="space-y-1.5">
                    <span className="text-5xs font-mono font-bold uppercase text-blue-600">
                      {course.category}
                    </span>
                    <h4 className="text-xs font-bold text-gray-800 leading-snug">
                      {course.title}
                    </h4>
                    <p className="text-3xs text-gray-500 leading-relaxed line-clamp-2">
                      {course.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col gap-3">
                  {/* Instructor Bio info */}
                  <div className="flex items-center justify-between text-4xs text-gray-400 font-mono">
                    <span>Prof: <strong>{course.instructorName}</strong></span>
                    <span>Chapters: <strong>{course.lessonsCount}</strong></span>
                  </div>

                  {/* Actions Area */}
                  {enrolled ? (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        onClick={() => onSelectCourse(course.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2.5 text-3xs font-bold text-blue-700 hover:bg-blue-100 transition-all active:scale-98"
                      >
                        <span>Resume Lesson</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600" title="Enrolled">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-3xs font-bold text-white shadow-md shadow-blue-100 hover:bg-blue-700 transition-all active:scale-98"
                    >
                      <span>Enroll in Course</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
};
