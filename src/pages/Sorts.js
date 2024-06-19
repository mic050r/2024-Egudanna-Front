import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import axios from 'axios';
import SearchBar from '../components/sorts/SearchBar';
import VideoPlayer from '../components/sorts/VideoPlayer';
import SideBar from '../components/sorts/SideBar';
import ConfirmationDialog from '../components/sorts/ConfirmationDialog';
import CommentSection from '../components/sorts/CommentSection';
import PopupInquiry from '../components/sorts/PopupInquiry';
import '../css/sorts.css';

const App = () => {
    const [hoveredBar, setHoveredBar] = useState(null);
    const [commentOpen, setCommentOpen] = useState(false);
    const [liked, setLiked] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [nickname, setNickname] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(1);
    const [barData, setBarData] = useState([]);
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        getChallenges();
    }, [currentIndex]);

    useEffect(() => {
        if (barData.length > 0) {
            getComments();
        }
    }, [barData]);

    const getChallenges = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_HOST}/api/challenges`);
            setBarData(response.data);
        } catch (err) {
            console.error('Error fetching challenges:', err);
        }
    };

    useEffect(() => {
        const handleWheel = debounce((event) => {
            if (!commentOpen) {
                setCurrentIndex((prevIndex) => {
                    let newIndex = event.deltaY > 0 ? prevIndex + 1 : prevIndex - 1;
                    newIndex = Math.max(newIndex, 0); // Prevent negative index
                    newIndex = Math.min(newIndex, barData.length - 1); // Prevent overflow index
                    return newIndex;
                });
                setCommentOpen(false);
                setLiked(false);
                setShowConfirmation(false);
            }
        }, 200);

        window.addEventListener('wheel', handleWheel);

        return () => {
            window.removeEventListener('wheel', handleWheel);
        };
    }, [commentOpen, barData.length]);

    const toggleCommentSection = () => {
        setCommentOpen(!commentOpen);
    };

    const getComments = async () => {
        try {
            const numberC = barData[currentIndex]?.id;
            const com = await axios.get(`${process.env.REACT_APP_HOST}/api/comments/${numberC}`);
            setComments(com.data);
        } catch (err) {
            console.error('Error fetching comments:', err);
        }
    };

    const incrementHeartCount = () => {
        setLiked(true);
        setBarData((prevBarData) =>
            prevBarData.map((item, index) =>
                index === currentIndex ? { ...item, likeNum: item.likeNum + 1 } : item
            )
        );
    };

    const handleCommentChange = (e) => {
        setNewComment(e.target.value);
    };

    const handleNicknameChange = (e) => {
        setNickname(e.target.value);
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (newComment.trim() !== '' && nickname.trim() !== '') {
            try {
                const payload = {
                    challenge_id: barData[currentIndex].id,
                    nickname: nickname,
                    comment: newComment,
                };

                const response = await axios.post(`${process.env.REACT_APP_HOST}/api/comments`, payload);

                const updatedComments = [...comments, response.data];
                setComments(updatedComments);
                setNewComment('');
                setNickname('');
                setBarData((prevBarData) =>
                    prevBarData.map((item, index) =>
                        index === currentIndex ? { ...item, comments: updatedComments } : item
                    )
                );
            } catch (err) {
                console.error('Error adding comment:', err);
            }
        }
    };

    const handleStartRecording = () => {
        setIsRecording(true);
    };

    const handleTrashClick = () => {
        setShowConfirmation(!showConfirmation);
    };

    const handleDeleteVideo = async (videoId, password) => {
        try {
            const response = await axios.delete(`${process.env.REACT_APP_HOST}/api/challenges/${videoId}`, {
                data: {
                    password: password,
                },
            });

            setBarData((prevBarData) => prevBarData.filter((_, index) => index !== currentIndex));
            setShowConfirmation(false);
            setCommentOpen(false);
            setLiked(false);
            setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        } catch (err) {
            console.error('Error deleting video:', err);
        }
    };

    const togglePopup = () => {
        setIsPopupVisible(!isPopupVisible);
    };

    const filteredBarData = barData.filter(video => video.title.includes(searchText));

    return (
        <div className="container">
            <SearchBar searchText={searchText} setSearchText={setSearchText} />
            <div className="image-wrapper">
                {filteredBarData.length > 0 && filteredBarData[currentIndex] ? (
                    <div key={filteredBarData[currentIndex].id}>
                        <VideoPlayer
                            videoData={filteredBarData[currentIndex]}
                            onTrashClick={handleTrashClick}
                            incrementHeartCount={incrementHeartCount}
                            toggleCommentSection={toggleCommentSection}
                            liked={liked}
                            comments={comments}
                        />
                        <SideBar videoData={filteredBarData[currentIndex]} />
                    </div>
                ) : (
                    <div className="no-video-message">
                        <p>영상이 없습니다.</p>
                    </div>
                )}
            </div>
            <ConfirmationDialog
                setShowConfirmation={setShowConfirmation}
                showConfirmation={showConfirmation}
                handleTrashClick={handleTrashClick}
                handleDeleteVideo={handleDeleteVideo}
            />
            <CommentSection
                commentOpen={commentOpen}
                toggleCommentSection={toggleCommentSection}
                comments={comments || []}
                handleCommentSubmit={handleCommentSubmit}
                newComment={newComment}
                handleCommentChange={handleCommentChange}
                nickname={nickname}
                handleNicknameChange={handleNicknameChange}
                currentIndex={currentIndex}
                barData={filteredBarData}
            />
            {isPopupVisible && <PopupInquiry setIsPopupVisible={setIsPopupVisible} />}
            <div className="bottom-left-buttons">
                <button className="button" onClick={togglePopup}>?</button>
                {!isRecording ? (
                    <button className="button" onClick={handleStartRecording}>+</button>
                ) : (
                    <button className="start-recording" onClick={() => window.location.href = '/screen'}>촬영 시작하기</button>
                )}
            </div>
            {currentIndex < filteredBarData.length - 1 && filteredBarData[currentIndex + 1]?.videoUrl && (
                <video
                    className="next-image-wrapper"
                    autoPlay={hoveredBar === filteredBarData[currentIndex + 1].id}
                    loop
                    muted
                    disablePictureInPicture
                >
                    <source src={filteredBarData[currentIndex + 1].videoUrl} type="video/mp4" />
                </video>
            )}
        </div>
    );
};

export default App;
