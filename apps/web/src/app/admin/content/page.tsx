"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  Eye,
  Tag,
  ExternalLink,
  BookOpen,
  AlertCircle,
  X,
} from "lucide-react";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/AuthContext";
import {
  ContentPublicationStatus,
  ResourceType,
  ResourceAccessType,
  type IBlogPost,
  type IResource,
  type IBlogCategory,
  type CreateBlogPostDto,
  type CreateResourceDto,
  type CreateBlogCategoryDto,
} from "@eta/types";

export default function AdminContentWorkspace() {
  const { status } = useAuth();
  const [activeTab, setActiveTab] = useState<"blog" | "resources" | "categories">("blog");

  // Blog Posts state
  const [posts, setPosts] = useState<IBlogPost[]>([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [blogSearch, setBlogSearch] = useState("");
  const [blogStatusFilter, setBlogStatusFilter] = useState<string>("ALL");

  // Resources state
  const [resources, setResources] = useState<IResource[]>([]);
  const [resLoading, setResLoading] = useState(true);
  const [resSearch, setResSearch] = useState("");
  const [resStatusFilter, setResStatusFilter] = useState<string>("ALL");

  // Categories state
  const [categories, setCategories] = useState<IBlogCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  // Modals state
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<IBlogPost | null>(null);
  const [blogForm, setBlogForm] = useState<CreateBlogPostDto>({
    title: "",
    excerpt: "",
    content: "",
    coverImage: "",
    categories: [],
    tags: [],
    status: ContentPublicationStatus.DRAFT,
    featured: false,
    seoTitle: "",
    seoDescription: "",
  });

  const [resModalOpen, setResModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<IResource | null>(null);
  const [resForm, setResForm] = useState<CreateResourceDto>({
    title: "",
    description: "",
    resourceType: ResourceType.DOCUMENT,
    fileUrl: "",
    externalUrl: "",
    category: "",
    tags: [],
    accessType: ResourceAccessType.PUBLIC,
    status: ContentPublicationStatus.DRAFT,
    featured: false,
  });

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState<CreateBlogCategoryDto>({
    name: "",
    description: "",
    sortOrder: 0,
    isActive: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
      return (err as { message: string }).message;
    }
    return fallback;
  };

  // Data Loaders
  const loadBlogPosts = useCallback(() => {
    const q = new URLSearchParams();
    if (blogStatusFilter !== "ALL") q.append("status", blogStatusFilter);
    if (blogSearch.trim()) q.append("search", blogSearch.trim());

    apiClient
      .get<IBlogPost[] | { posts: IBlogPost[] }>(`/blog/admin/all?${q.toString()}`)
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : res && "posts" in res && Array.isArray(res.posts)
          ? res.posts
          : [];
        setPosts(list);
        setBlogLoading(false);
      })
      .catch((err: unknown) => {
        setErrorMsg(getErrorMessage(err, "Failed to load blog posts"));
        setBlogLoading(false);
      });
  }, [blogStatusFilter, blogSearch]);

  const loadResources = useCallback(() => {
    const q = new URLSearchParams();
    if (resStatusFilter !== "ALL") q.append("status", resStatusFilter);
    if (resSearch.trim()) q.append("search", resSearch.trim());

    apiClient
      .get<IResource[] | { resources: IResource[] }>(`/resources/admin/all?${q.toString()}`)
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : res && "resources" in res && Array.isArray(res.resources)
          ? res.resources
          : [];
        setResources(list);
        setResLoading(false);
      })
      .catch((err: unknown) => {
        setErrorMsg(getErrorMessage(err, "Failed to load resources"));
        setResLoading(false);
      });
  }, [resStatusFilter, resSearch]);

  const loadCategories = useCallback(() => {
    apiClient
      .get<IBlogCategory[]>("/blog/admin/categories")
      .then((res) => {
        if (Array.isArray(res)) setCategories(res);
        setCatLoading(false);
      })
      .catch(() => setCatLoading(false));
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      loadBlogPosts();
      loadResources();
      loadCategories();
    }
  }, [status, loadBlogPosts, loadResources, loadCategories]);

  // Handlers for Blog
  const handleOpenBlogModal = (postToEdit?: IBlogPost) => {
    setErrorMsg(null);
    if (postToEdit) {
      setEditingPost(postToEdit);
      setBlogForm({
        title: postToEdit.title,
        excerpt: postToEdit.excerpt,
        content: postToEdit.content,
        coverImage: postToEdit.coverImage || "",
        categories: postToEdit.categories || [],
        tags: postToEdit.tags || [],
        status: postToEdit.status,
        featured: postToEdit.featured,
        seoTitle: postToEdit.seoTitle || "",
        seoDescription: postToEdit.seoDescription || "",
      });
    } else {
      setEditingPost(null);
      setBlogForm({
        title: "",
        excerpt: "",
        content: "",
        coverImage: "",
        categories: [],
        tags: [],
        status: ContentPublicationStatus.DRAFT,
        featured: false,
        seoTitle: "",
        seoDescription: "",
      });
    }
    setBlogModalOpen(true);
  };

  const handleSaveBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingPost) {
        await apiClient.patch(`/blog/${editingPost.id}`, blogForm);
        setSuccessMsg("Article updated successfully");
      } else {
        await apiClient.post("/blog", blogForm);
        setSuccessMsg("Article created successfully");
      }
      setBlogModalOpen(false);
      loadBlogPosts();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to save article"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublishPost = async (post: IBlogPost) => {
    try {
      if (post.status === ContentPublicationStatus.PUBLISHED) {
        await apiClient.post(`/blog/${post.id}/archive`, {});
        setSuccessMsg("Article archived");
      } else {
        await apiClient.post(`/blog/${post.id}/publish`, {});
        setSuccessMsg("Article published");
      }
      loadBlogPosts();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to update article status"));
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article? This action cannot be undone.")) return;
    try {
      await apiClient.delete(`/blog/${id}`);
      setSuccessMsg("Article deleted");
      loadBlogPosts();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to delete article"));
    }
  };

  // Handlers for Resources
  const handleOpenResModal = (resToEdit?: IResource) => {
    setErrorMsg(null);
    if (resToEdit) {
      setEditingResource(resToEdit);
      setResForm({
        title: resToEdit.title,
        description: resToEdit.description,
        resourceType: resToEdit.resourceType,
        fileUrl: resToEdit.fileUrl || "",
        externalUrl: resToEdit.externalUrl || "",
        category: resToEdit.category || "",
        tags: resToEdit.tags || [],
        accessType: resToEdit.accessType,
        status: resToEdit.status,
        featured: resToEdit.featured,
      });
    } else {
      setEditingResource(null);
      setResForm({
        title: "",
        description: "",
        resourceType: ResourceType.DOCUMENT,
        fileUrl: "",
        externalUrl: "",
        category: "",
        tags: [],
        accessType: ResourceAccessType.PUBLIC,
        status: ContentPublicationStatus.DRAFT,
        featured: false,
      });
    }
    setResModalOpen(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingResource) {
        await apiClient.patch(`/resources/${editingResource.id}`, resForm);
        setSuccessMsg("Resource updated successfully");
      } else {
        await apiClient.post("/resources", resForm);
        setSuccessMsg("Resource created successfully");
      }
      setResModalOpen(false);
      loadResources();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to save resource"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublishResource = async (resItem: IResource) => {
    try {
      if (resItem.status === ContentPublicationStatus.PUBLISHED) {
        await apiClient.post(`/resources/${resItem.id}/archive`, {});
        setSuccessMsg("Resource archived");
      } else {
        await apiClient.post(`/resources/${resItem.id}/publish`, {});
        setSuccessMsg("Resource published");
      }
      loadResources();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to update resource status"));
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      await apiClient.delete(`/resources/${id}`);
      setSuccessMsg("Resource deleted");
      loadResources();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to delete resource"));
    }
  };

  // Handlers for Categories
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await apiClient.post("/blog/admin/categories", catForm);
      setSuccessMsg("Category created successfully");
      setCatModalOpen(false);
      setCatForm({ name: "", description: "", sortOrder: 0, isActive: true });
      loadCategories();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to create category"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await apiClient.delete(`/blog/admin/categories/${id}`);
      setSuccessMsg("Category deleted");
      loadCategories();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to delete category"));
    }
  };

  return (
    <div className="min-h-screen bg-[#050B14] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Workspace Title & Alert Messages */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-8 border-b border-white/10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#16C4FF]/30 bg-[#0752B5]/15 px-3 py-1 text-xs font-semibold text-[#16C4FF]">
              <FileText className="h-3.5 w-3.5" />
              Editorial & Content Management
            </div>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl text-white">
              Institutional Editorial Workspace
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Author and publish research dispatches, pedagogical journals, and open learning resources (PRD §52).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              <Eye className="h-3.5 w-3.5 text-[#16C4FF]" />
              View Public Blog
            </Link>
            <Link
              href="/resources"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              <Eye className="h-3.5 w-3.5 text-amber-400" />
              View Resources
            </Link>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-8 flex gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("blog")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "blog"
                ? "bg-[#0B7CEB] text-white shadow-lg shadow-[#0B7CEB]/25"
                : "border border-white/10 bg-[#081324] text-slate-300 hover:bg-white/5"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Blog Articles ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab("resources")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "resources"
                ? "bg-[#0B7CEB] text-white shadow-lg shadow-[#0B7CEB]/25"
                : "border border-white/10 bg-[#081324] text-slate-300 hover:bg-white/5"
            }`}
          >
            <Layers className="h-4 w-4" />
            Resource Library ({resources.length})
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "categories"
                ? "bg-[#0B7CEB] text-white shadow-lg shadow-[#0B7CEB]/25"
                : "border border-white/10 bg-[#081324] text-slate-300 hover:bg-white/5"
            }`}
          >
            <Tag className="h-4 w-4" />
            Categories ({categories.length})
          </button>
        </div>

        {/* TAB 1: BLOG ARTICLES */}
        {activeTab === "blog" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-1 items-center gap-3 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={blogSearch}
                    onChange={(e) => setBlogSearch(e.target.value)}
                    placeholder="Search articles..."
                    className="w-full rounded-xl border border-white/10 bg-[#081324] py-2 pl-10 pr-4 text-xs text-white placeholder-slate-400 outline-none focus:border-[#16C4FF]"
                  />
                </div>
                <select
                  value={blogStatusFilter}
                  onChange={(e) => setBlogStatusFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#081324] py-2 px-3 text-xs text-slate-300 outline-none focus:border-[#16C4FF]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value={ContentPublicationStatus.DRAFT}>Draft</option>
                  <option value={ContentPublicationStatus.PUBLISHED}>Published</option>
                  <option value={ContentPublicationStatus.ARCHIVED}>Archived</option>
                </select>
              </div>

              <button
                onClick={() => handleOpenBlogModal()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B7CEB] px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#0752B5]"
              >
                <Plus className="h-4 w-4" />
                New Article Draft
              </button>
            </div>

            {/* Articles Table */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#081324]">
              {blogLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading articles...</div>
              ) : posts.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No articles found in this filter view. Click &quot;New Article Draft&quot; to begin.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-white/5 font-semibold text-slate-300">
                      <tr>
                        <th className="py-3 px-4">Title & Slug</th>
                        <th className="py-3 px-4">Author</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Reading Time</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {posts.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white max-w-sm truncate">{p.title}</div>
                            <div className="text-[11px] text-slate-400 font-mono">/blog/{p.slug}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div>{p.authorName}</div>
                            <div className="text-[10px] text-slate-400">{p.authorRole}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {p.categories.map((c) => (
                                <span key={c} className="rounded bg-white/10 px-1.5 py-0.2 text-[10px]">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">{p.readingTime} min</td>
                          <td className="py-3 px-4">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                p.status === ContentPublicationStatus.PUBLISHED
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : p.status === ContentPublicationStatus.DRAFT
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                  : "bg-slate-500/15 text-slate-400 border border-slate-500/30"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <Link
                              href={`/blog/${p.slug}`}
                              target="_blank"
                              title="Public Preview"
                              className="inline-flex items-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => handleTogglePublishPost(p)}
                              title={p.status === ContentPublicationStatus.PUBLISHED ? "Archive" : "Publish"}
                              className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold ${
                                p.status === ContentPublicationStatus.PUBLISHED
                                  ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                                  : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                              }`}
                            >
                              {p.status === ContentPublicationStatus.PUBLISHED ? "Archive" : "Publish"}
                            </button>
                            <button
                              onClick={() => handleOpenBlogModal(p)}
                              title="Edit Article"
                              className="inline-flex items-center p-1.5 rounded-lg text-slate-400 hover:text-[#16C4FF] hover:bg-white/10"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePost(p.id)}
                              title="Delete"
                              className="inline-flex items-center p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: RESOURCES */}
        {activeTab === "resources" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-1 items-center gap-3 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={resSearch}
                    onChange={(e) => setResSearch(e.target.value)}
                    placeholder="Search resources..."
                    className="w-full rounded-xl border border-white/10 bg-[#081324] py-2 pl-10 pr-4 text-xs text-white placeholder-slate-400 outline-none focus:border-[#16C4FF]"
                  />
                </div>
                <select
                  value={resStatusFilter}
                  onChange={(e) => setResStatusFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#081324] py-2 px-3 text-xs text-slate-300 outline-none focus:border-[#16C4FF]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value={ContentPublicationStatus.DRAFT}>Draft</option>
                  <option value={ContentPublicationStatus.PUBLISHED}>Published</option>
                  <option value={ContentPublicationStatus.ARCHIVED}>Archived</option>
                </select>
              </div>

              <button
                onClick={() => handleOpenResModal()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B7CEB] px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#0752B5]"
              >
                <Plus className="h-4 w-4" />
                New Resource
              </button>
            </div>

            {/* Resources Table */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#081324]">
              {resLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading resources...</div>
              ) : resources.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No resources found. Click &quot;New Resource&quot; to add learning materials.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-white/5 font-semibold text-slate-300">
                      <tr>
                        <th className="py-3 px-4">Title & Slug</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Access</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Accesses</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {resources.map((r) => (
                        <tr key={r.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white max-w-sm truncate">{r.title}</div>
                            <div className="text-[11px] text-slate-400 font-mono">/resources/{r.slug}</div>
                          </td>
                          <td className="py-3 px-4 capitalize font-semibold text-[#16C4FF]">
                            {r.resourceType.toLowerCase().replace("_", " ")}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                r.accessType === ResourceAccessType.MEMBERS_ONLY
                                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                                  : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {r.accessType}
                            </span>
                          </td>
                          <td className="py-3 px-4">{r.category || "—"}</td>
                          <td className="py-3 px-4">{r.downloadCount || 0}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                r.status === ContentPublicationStatus.PUBLISHED
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : r.status === ContentPublicationStatus.DRAFT
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                  : "bg-slate-500/15 text-slate-400 border border-slate-500/30"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <Link
                              href={`/resources/${r.slug}`}
                              target="_blank"
                              title="Public Preview"
                              className="inline-flex items-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => handleTogglePublishResource(r)}
                              title={r.status === ContentPublicationStatus.PUBLISHED ? "Archive" : "Publish"}
                              className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold ${
                                r.status === ContentPublicationStatus.PUBLISHED
                                  ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                                  : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                              }`}
                            >
                              {r.status === ContentPublicationStatus.PUBLISHED ? "Archive" : "Publish"}
                            </button>
                            <button
                              onClick={() => handleOpenResModal(r)}
                              title="Edit"
                              className="inline-flex items-center p-1.5 rounded-lg text-slate-400 hover:text-[#16C4FF] hover:bg-white/10"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteResource(r.id)}
                              title="Delete"
                              className="inline-flex items-center p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES */}
        {activeTab === "categories" && (
          <div className="mt-6 space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setCatModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B7CEB] px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#0752B5]"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#081324]">
              {catLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading categories...</div>
              ) : categories.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">No categories created yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-white/5 font-semibold text-slate-300">
                      <tr>
                        <th className="py-3 px-4">Name & Slug</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Sort Order</th>
                        <th className="py-3 px-4">Active</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {categories.map((c) => (
                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{c.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{c.slug}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-xs">{c.description || "—"}</td>
                          <td className="py-3 px-4">{c.sortOrder}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                c.isActive
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-slate-500/15 text-slate-400 border border-slate-500/30"
                              }`}
                            >
                              {c.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteCategory(c.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Blog Post Form */}
        {blogModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-3xl rounded-3xl border border-white/15 bg-[#081324] p-6 sm:p-8 shadow-2xl my-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white">
                  {editingPost ? "Edit Article" : "Create New Article Draft"}
                </h3>
                <button onClick={() => setBlogModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBlogPost} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Article Title *</label>
                  <input
                    type="text"
                    required
                    value={blogForm.title}
                    onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                    placeholder="e.g. Architecting Scalable Learning Systems"
                    className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Excerpt / Summary *</label>
                  <textarea
                    required
                    rows={2}
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                    placeholder="Brief 1-2 sentence lead explaining key concepts..."
                    className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Content Body (Supports Markdown #, ##, -, &gt;, ```) *
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={blogForm.content}
                    onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                    placeholder="Write the full article body using Markdown..."
                    className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs font-mono text-white outline-none focus:border-[#16C4FF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Cover Image URL</label>
                    <input
                      type="text"
                      value={blogForm.coverImage}
                      onChange={(e) => setBlogForm({ ...blogForm, coverImage: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Categories (comma-separated)</label>
                    <input
                      type="text"
                      value={blogForm.categories?.join(", ")}
                      onChange={(e) =>
                        setBlogForm({
                          ...blogForm,
                          categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="Computer Science, Systems"
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={blogForm.tags?.join(", ")}
                      onChange={(e) =>
                        setBlogForm({
                          ...blogForm,
                          tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="algorithms, consensus, raft"
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Publication Status</label>
                    <select
                      value={blogForm.status}
                      onChange={(e) =>
                        setBlogForm({ ...blogForm, status: e.target.value as ContentPublicationStatus })
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                    >
                      <option value={ContentPublicationStatus.DRAFT}>Draft</option>
                      <option value={ContentPublicationStatus.PUBLISHED}>Published</option>
                      <option value={ContentPublicationStatus.ARCHIVED}>Archived</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="blogFeatured"
                    checked={blogForm.featured}
                    onChange={(e) => setBlogForm({ ...blogForm, featured: e.target.checked })}
                    className="rounded border-white/20 bg-[#050B14] text-[#0B7CEB]"
                  />
                  <label htmlFor="blogFeatured" className="text-xs font-semibold text-slate-300">
                    Feature on Blog Index & Homepage
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setBlogModalOpen(false)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-[#0B7CEB] px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-[#0752B5] disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editingPost ? "Update Article" : "Create Article"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Resource Form */}
        {resModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-[#081324] p-6 sm:p-8 shadow-2xl my-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white">
                  {editingResource ? "Edit Learning Resource" : "Create New Resource"}
                </h3>
                <button onClick={() => setResModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveResource} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Resource Title *</label>
                  <input
                    type="text"
                    required
                    value={resForm.title}
                    onChange={(e) => setResForm({ ...resForm, title: e.target.value })}
                    placeholder="e.g. Algorithmic Problem Solving Handout"
                    className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={resForm.description}
                    onChange={(e) => setResForm({ ...resForm, description: e.target.value })}
                    placeholder="Explain what learners will find in this resource..."
                    className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Resource Type *</label>
                    <select
                      value={resForm.resourceType}
                      onChange={(e) =>
                        setResForm({ ...resForm, resourceType: e.target.value as ResourceType })
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                    >
                      <option value={ResourceType.DOCUMENT}>Document / Handout</option>
                      <option value={ResourceType.LEARNING_GUIDE}>Learning Guide</option>
                      <option value={ResourceType.VIDEO}>Video Lecture</option>
                      <option value={ResourceType.TEMPLATE}>Lab Template</option>
                      <option value={ResourceType.PUBLIC_LESSON}>Public Lesson</option>
                      <option value={ResourceType.PDF}>PDF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Access Tier</label>
                    <select
                      value={resForm.accessType}
                      onChange={(e) =>
                        setResForm({ ...resForm, accessType: e.target.value as ResourceAccessType })
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                    >
                      <option value={ResourceAccessType.PUBLIC}>Public (All Visitors)</option>
                      <option value={ResourceAccessType.MEMBERS_ONLY}>Members Only (Sign-in Required)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Direct File URL</label>
                    <input
                      type="text"
                      value={resForm.fileUrl}
                      onChange={(e) => setResForm({ ...resForm, fileUrl: e.target.value })}
                      placeholder="https://storage.example.com/sheet.pdf"
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">External / Video URL</label>
                    <input
                      type="text"
                      value={resForm.externalUrl}
                      onChange={(e) => setResForm({ ...resForm, externalUrl: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Category</label>
                    <input
                      type="text"
                      value={resForm.category}
                      onChange={(e) => setResForm({ ...resForm, category: e.target.value })}
                      placeholder="Computer Science"
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Publication Status</label>
                    <select
                      value={resForm.status}
                      onChange={(e) =>
                        setResForm({ ...resForm, status: e.target.value as ContentPublicationStatus })
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                    >
                      <option value={ContentPublicationStatus.DRAFT}>Draft</option>
                      <option value={ContentPublicationStatus.PUBLISHED}>Published</option>
                      <option value={ContentPublicationStatus.ARCHIVED}>Archived</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="resFeatured"
                    checked={resForm.featured}
                    onChange={(e) => setResForm({ ...resForm, featured: e.target.checked })}
                    className="rounded border-white/20 bg-[#050B14] text-[#0B7CEB]"
                  />
                  <label htmlFor="resFeatured" className="text-xs font-semibold text-slate-300">
                    Feature in Library
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setResModalOpen(false)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-[#0B7CEB] px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-[#0752B5] disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editingResource ? "Update Resource" : "Create Resource"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Category Form */}
        {catModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#081324] p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white">Create Blog Category</h3>
                <button onClick={() => setCatModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    placeholder="e.g. Distributed Systems"
                    className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                    placeholder="Description of topics covered..."
                    className="w-full rounded-xl border border-white/10 bg-[#050B14] p-3 text-xs text-white outline-none focus:border-[#16C4FF]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setCatModalOpen(false)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-[#0B7CEB] px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-[#0752B5] disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Create Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
