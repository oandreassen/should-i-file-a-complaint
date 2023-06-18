import React, { useState } from 'react';
import axios from 'axios';
import './searchbox.css';

interface CompilationMatch {
    id: string,
    reason: string,
    mode: "full" | "partial";
}

const SearchBox: React.FC = () => {
    const [query, setQuery] = useState<string>('');
    const [results, setResults] = useState<CompilationMatch[]>([]);
    const [isFullMatch, setIsFullMatch] = useState(false);
    const [hasResult, setHasResult] = useState(false);
    const [responseMessage, setResponseMessage] = useState('');
    const [isLoading, setisLoading] = useState(false);
    const [error, setError] = useState('');

    const onReset = async () => {
        setIsFullMatch(false);
        setHasResult(false);
        setQuery('');
        setResponseMessage(responseMessage);
    };

    const renderLoadingAnimation = () => {
        return (
            <div className="lds-facebook"><div></div><div></div><div></div></div>
        );
    };

    const renderWorkItem = (id: string, isFirst: boolean = false, isLast: boolean = false) => {
        let url = `https://dev.azure.com/tmhe/I_Site/_workitems/edit/${id}`;

        return (
            <React.Fragment>
                {isFirst ? <React.Fragment /> : (isLast ? ' and ' : ', ')}
                <a target='_blank' href={url}>{id}</a>
            </React.Fragment>
        );
    };

    const renderFullMatch = (existingItems: CompilationMatch[]) => {
        return (
            <div className='search-Result'>No, it's already covered in {existingItems.map((item, index, array) =>
                renderWorkItem(item.id, (index === 0), (index === array.length - 1)))}</div>
        );
    };

    const renderError = () => {
        return (
            <div className='search-Result'>{error}</div>
        );
    };

    const renderPartialMatch = (existingItems: CompilationMatch[]) => {
        return (
            <div className='search-Result'>Maybe, it's partially covered in {existingItems.map((item, index, array) =>
                renderWorkItem(item.id, (index === 0), (index === array.length - 1)))}</div>
        );
    };

    const renderNoMatch = () => {
        return (
            <div className='search-Result'>Yes.</div>
        );
    };

    const renderResponse = (items: CompilationMatch[]) => {

        if (error.length > 0) {
            return renderError();
        }

        if (items.find((result: any) => result.mode === "full")) {
            return renderFullMatch(items);
        } else if (items.find((result: any) => result.mode === "partial")) {
            return renderPartialMatch(items);
        }

        return renderNoMatch();
    };

    const search = async () => {
        setisLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/search', { query });
            if (response.data) {
                setResults(response.data);
            } else {
                setError('Sorry, but your query returned no data at all.');
            }
        } catch (error: any) {
            setError(error.response.data);
        } finally {
            setHasResult(true);
            setisLoading(false);
        }
    };

    React.useEffect(() => {

    }, [isFullMatch]);

    const renderForm = () => {
        return (
            <div className='search-Area'>
                <p style={{ marginTop: '8px' }}>
                    {!hasResult ? (
                        <React.Fragment>
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                            <button onClick={search}>
                                Check
                            </button>
                        </React.Fragment>
                    )
                        :
                        (
                            <React.Fragment>
                                {renderResponse(results)}
                                <br />
                                <button onClick={onReset}>Reset</button>
                            </React.Fragment>
                        )
                    }
                </p >
            </div>
        );
    };


    if (isLoading) {
        return renderLoadingAnimation();
    }

    return renderForm();
};

export default SearchBox;;
