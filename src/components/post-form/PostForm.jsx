import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Input, RTE, Select } from "..";
import appwriteService from "../../appwrite/config";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function PostForm({ post }) {
    const { register, handleSubmit, watch, setValue, control, getValues } = useForm({
        defaultValues: {
            title: post?.title || "",
            slug: post?.slug || "",
            content: post?.content || "",
            status: post?.status || "active",
        },
    });

    const navigate = useNavigate();
    const userData = useSelector((state) => state.auth.userData);

    const slugTransform = useCallback((value) => {
        if (value && typeof value === "string")
            return value
                .trim()
                .toLowerCase()
                .replace(/[^a-zA-Z\d\s]+/g, "-")
                .replace(/\s/g, "-");
        return "";
    }, []);

    useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (name === "title") {
                setValue("slug", slugTransform(value.title), {
                    shouldValidate: true,
                });
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, slugTransform, setValue]);

    const submit = async (data) => {
        try {
            if (!userData || !userData.$id) {
                alert("You must be logged in to create or update a post.");
                return;
            }

            const file = data.image?.[0]
                ? await appwriteService.uploadFile(data.image[0])
                : null;

            if (post) {
                // Update flow
                const updatedPost = await appwriteService.updatePost(post.$id, {
                    ...data,
                    slug: slugTransform(data.slug || data.title),
                    featuredImage: file ? file.$id : post.featuredImage,
                });

                if (file) {
                    await appwriteService.deleteFile(post.featuredImage);
                }

                if (updatedPost && updatedPost.$id) {
                    navigate(`/post/${updatedPost.$id}`);
                } else {
                    console.error("Update failed:", updatedPost);
                    alert("Failed to update the post.");
                }
            } else {
                // Create flow
                if (!file) {
                    alert("File upload failed.");
                    return;
                }

                const dbPost = await appwriteService.createPost({
                    title: data.title,
                    slug: slugTransform(data.slug || data.title),
                    content: data.content,
                    status: data.status,
                    featuredImage: file.$id,
                    userId: userData.$id, // ✅ needed for permissions
                });

                if (dbPost && dbPost.$id) {
                    navigate(`/post/${dbPost.$id}`);
                } else {
                    console.error("Create failed:", dbPost);
                    alert("Post creation failed.");
                }
            }
        } catch (error) {
            console.error("Submit error:", error);
            alert("Something went wrong. Please try again.");
        }
    };

    return (
        <form onSubmit={handleSubmit(submit)} className="flex flex-wrap">
            <div className="w-2/3 px-2">
                <Input
                    label="Title :"
                    placeholder="Title"
                    className="mb-4"
                    {...register("title", { required: true })}
                />
                <Input
                    label="Slug :"
                    placeholder="Slug"
                    className="mb-4"
                    {...register("slug", { required: true })}
                    onInput={(e) =>
                        setValue("slug", slugTransform(e.currentTarget.value), {
                            shouldValidate: true,
                        })
                    }
                />
                <RTE
                    label="Content :"
                    name="content"
                    control={control}
                    defaultValue={getValues("content")}
                />
            </div>
            <div className="w-1/3 px-2">
                <Input
                    label="Featured Image :"
                    type="file"
                    className="mb-4"
                    accept="image/png, image/jpg, image/jpeg, image/gif"
                    {...register("image", { required: !post })}
                />
                {post && (
                    <div className="w-full mb-4">
                        <img
                            src={appwriteService.getFilePreview(post.featuredImage)}
                            alt={post.title}
                            className="rounded-lg"
                        />
                    </div>
                )}
                <Select
                    options={["active", "inactive"]}
                    label="Status"
                    className="mb-4"
                    {...register("status", { required: true })}
                />
                <Button
                    type="submit"
                    bgColor={post ? "bg-green-500" : undefined}
                    className="w-full"
                >
                    {post ? "Update" : "Submit"}
                </Button>
            </div>
        </form>
    );
}
